// The two fake backends of the hermetic layer, in one process:
//
//   subgraph fake  POST /graphql on the "subgraph" port. Speaks what
//                  /api/graphql and the SSR gateway client send:
//                  { query, operationName, variables } with a Bearer token.
//                  Refuses what the real query gateway refuses (see
//                  gateway/policy.mjs), with the gateway's 400.
//   S3 fake        the "s3" port. Path-style PutObject / HeadObject, answering
//                  with x-amz-meta-cid like a Filebase IPFS bucket, plus
//                  GET /ipfs/<cid> so the tests can serve the IPFS gateway.
//
// Both have a control API under /__control/ for the tests (see
// e2e/support/backends/subgraph.ts and s3.ts).
import { createHash } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import { CONTRACTS, FORK_BLOCK, HOST, PORTS, URLS, baselineFile } from "../stack/config.mjs";
import { jsonRpc } from "../stack/processes.mjs";
import { gatewayRefusal } from "./gateway/policy.mjs";
import { createIndexer } from "./indexer.mjs";
import { createExecutor } from "./query.mjs";
import { EntityStore } from "./store.mjs";

const MAX_BODY_BYTES = 8 * 1024 * 1024;

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    request.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function sendJson(response, status, body, headers = {}) {
  const text = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(text),
    ...headers,
  });
  response.end(text);
}

async function readJson(request) {
  const raw = (await readBody(request)).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, HOST, () => resolve());
  });
}

function close(server) {
  return new Promise((resolve) => {
    server.closeAllConnections?.();
    server.close(() => resolve());
  });
}

const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";

/** CIDv1, raw codec, sha2-256, base32: the "bafkrei..." form the subgraph accepts. */
export function rawCid(bytes) {
  const digest = createHash("sha256").update(bytes).digest();
  const cid = Buffer.concat([Buffer.from([0x01, 0x55, 0x12, 0x20]), digest]);
  let bits = "";
  for (const byte of cid) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let index = 0; index < bits.length; index += 5) {
    out += BASE32[parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  }
  return `b${out}`;
}

function createS3Fake() {
  /** cid -> { bytes, contentType } */
  const objects = new Map();
  /** "bucket/key" -> cid */
  const keys = new Map();
  const requests = [];
  let failNext = { count: 0, status: 500 };

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, URLS.s3);
      const path = decodeURIComponent(url.pathname);

      if (path === "/__control/health") return sendJson(response, 200, { ok: true });
      if (path === "/__control/reset" && request.method === "POST") {
        requests.length = 0;
        failNext = { count: 0, status: 500 };
        return sendJson(response, 200, { ok: true });
      }
      if (path === "/__control/fail" && request.method === "POST") {
        const body = await readJson(request);
        failNext = { count: Number(body.count ?? 1), status: Number(body.status ?? 500) };
        return sendJson(response, 200, { ok: true });
      }
      if (path === "/__control/requests") return sendJson(response, 200, { requests });
      if (path === "/__control/put" && request.method === "POST") {
        // Direct upload for seeding: the body is stored as given.
        const bytes = await readBody(request);
        const cid = rawCid(bytes);
        objects.set(cid, { bytes, contentType: request.headers["content-type"] ?? "application/octet-stream" });
        return sendJson(response, 200, { cid });
      }

      if (path.startsWith("/ipfs/") && (request.method === "GET" || request.method === "HEAD")) {
        const object = objects.get(path.slice("/ipfs/".length).split("/")[0]);
        if (!object) {
          response.writeHead(404, { "content-type": "text/plain" });
          return response.end("not found in the S3 fake");
        }
        response.writeHead(200, {
          "content-type": object.contentType,
          "content-length": object.bytes.length,
          "access-control-allow-origin": "*",
        });
        return response.end(request.method === "HEAD" ? undefined : object.bytes);
      }

      // S3, path style: /<bucket>/<key...>
      const key = path.replace(/^\//, "");
      if (request.method === "PUT") {
        const bytes = await readBody(request);
        requests.push({ method: "PUT", key, bytes: bytes.length, at: Date.now() });
        if (failNext.count > 0) {
          failNext.count -= 1;
          response.writeHead(failNext.status, { "content-type": "application/xml" });
          return response.end(
            `<?xml version="1.0" encoding="UTF-8"?><Error><Code>InternalError</Code><Message>Injected by the S3 fake</Message></Error>`,
          );
        }
        const cid = rawCid(bytes);
        objects.set(cid, { bytes, contentType: request.headers["content-type"] ?? "application/octet-stream" });
        keys.set(key, cid);
        response.writeHead(200, {
          etag: `"${createHash("md5").update(bytes).digest("hex")}"`,
          "x-amz-meta-cid": cid,
          "content-length": 0,
        });
        return response.end();
      }
      if (request.method === "HEAD" || request.method === "GET") {
        requests.push({ method: request.method, key, at: Date.now() });
        const cid = keys.get(key);
        const object = cid && objects.get(cid);
        if (!object) {
          response.writeHead(404, { "content-type": "application/xml" });
          return response.end(
            request.method === "HEAD"
              ? undefined
              : `<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchKey</Code></Error>`,
          );
        }
        response.writeHead(200, {
          "content-type": object.contentType,
          "content-length": object.bytes.length,
          "x-amz-meta-cid": cid,
        });
        return response.end(request.method === "HEAD" ? undefined : object.bytes);
      }
      response.writeHead(405);
      response.end();
    } catch (error) {
      sendJson(response, 500, { error: String(error?.message ?? error) });
    }
  });

  return { server, objects };
}

function createSubgraphFake({ s3Objects }) {
  const store = new EntityStore();
  const rpc = (method, params) => jsonRpc(URLS.anvil, method, params);
  const indexer = createIndexer({ store, rpc, badgesAddress: CONTRACTS.badges });

  /** Metadata comes from "IPFS": here, whatever JSON the S3 fake holds for the CID. */
  function resolveMissing(typeName, id) {
    if (typeName !== "Metadata") return undefined;
    const object = s3Objects.get(id.split("/")[0]);
    if (!object) return undefined;
    try {
      const parsed = JSON.parse(object.bytes.toString("utf8"));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
      const text = (value) => (typeof value === "string" ? value : null);
      const image = text(parsed.imageUrl);
      return {
        id,
        name: text(parsed.name),
        bio: text(parsed.bio),
        imageUrl: image && image.startsWith("data:") ? null : image,
        description: text(parsed.description),
      };
    } catch {
      return undefined;
    }
  }

  const executor = createExecutor({ store, resolveMissing });

  let cursor = FORK_BLOCK;
  let syncing;
  const requests = [];
  /** Test controls, cleared by reset. */
  let faults = [];
  let meta = { lagBlocks: 0, freezeAt: undefined, stalled: false };

  /**
   * Brings the store up to the chain head. One run at a time. A stalled fake
   * (a test imitating a subgraph that has stopped indexing) applies nothing:
   * its entities and its _meta both stay where they were.
   */
  function sync() {
    if (meta.stalled) return Promise.resolve(cursor);
    syncing ??= (async () => {
      try {
        const head = Number(await rpc("eth_blockNumber", []));
        if (head > cursor) {
          await indexer.indexRange(cursor + 1, head);
          cursor = head;
        }
        return cursor;
      } finally {
        syncing = undefined;
      }
    })();
    return syncing;
  }

  function reportedBlock() {
    if (meta.freezeAt !== undefined) return Math.min(meta.freezeAt, cursor);
    return Math.max(0, cursor - meta.lagBlocks);
  }

  function takeFault(operationName) {
    const index = faults.findIndex(
      (fault) => fault.remaining > 0 && (!fault.operation || fault.operation === operationName),
    );
    if (index < 0) return undefined;
    const fault = faults[index];
    fault.remaining -= 1;
    return fault;
  }

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, URLS.subgraph);

      if (url.pathname === "/graphql" && request.method === "POST") {
        const body = await readJson(request);
        const authorization = request.headers.authorization ?? "";
        const record = {
          operationName: body.operationName,
          variables: body.variables ?? {},
          authorized: authorization.startsWith("Bearer ") && authorization.length > 7,
          at: Date.now(),
        };
        requests.push(record);
        // The query gateway sits between the app and the subgraph and refuses
        // what its registry does not allow, before any subgraph fault applies.
        const refusal = gatewayRefusal(body);
        if (refusal) {
          record.refused = { status: refusal.status, message: refusal.message };
          return sendJson(response, refusal.status, { errors: [{ message: refusal.message }] });
        }
        const fault = takeFault(body.operationName);
        if (fault?.kind === "http-error") {
          response.writeHead(fault.status ?? 500, { "content-type": "text/plain" });
          return response.end("Injected by the subgraph fake");
        }
        if (fault?.kind === "graphql-error") {
          return sendJson(response, 200, { errors: [{ message: fault.message ?? "Injected by the subgraph fake" }] });
        }
        if (fault?.kind === "invalid-json") {
          response.writeHead(200, { "content-type": "application/json" });
          return response.end("{ not json");
        }
        if (fault?.kind === "delay") await new Promise((resolve) => setTimeout(resolve, fault.ms ?? 1_000));
        await sync();
        const result = await executor.execute(body, {
          block: { number: reportedBlock(), hash: null, parentHash: null, timestamp: null },
          deployment: "e2e-subgraph-fake",
          hasIndexingErrors: false,
        });
        // The app hides upstream error messages from the browser; keep them here for the tests.
        if (result.errors?.length) record.errors = result.errors.map((error) => `${error.path?.join(".")}: ${error.message}`);
        return sendJson(response, 200, result);
      }

      if (url.pathname === "/__control/health") {
        return sendJson(response, 200, { ok: true, cursor, forkBlock: FORK_BLOCK });
      }
      if (url.pathname === "/__control/reset" && request.method === "POST") {
        store.resetOverlay();
        faults = [];
        meta = { lagBlocks: 0, freezeAt: undefined, stalled: false };
        requests.length = 0;
        return sendJson(response, 200, { ok: true });
      }
      if (url.pathname === "/__control/overlay" && request.method === "POST") {
        const body = await readJson(request);
        if (!Array.isArray(body.ops)) return sendJson(response, 400, { error: "ops must be an array" });
        try {
          store.pushOverlay(body.ops);
        } catch (error) {
          return sendJson(response, 400, { error: String(error.message) });
        }
        return sendJson(response, 200, { ok: true, overlayOps: store.overlay.length });
      }
      if (url.pathname === "/__control/faults" && request.method === "POST") {
        const body = await readJson(request);
        // `clear` ends the faults injected so far and leaves the overlays,
        // the _meta lag and the request log alone.
        if (body.clear) faults = [];
        for (const fault of body.faults ?? []) {
          faults.push({ ...fault, remaining: Number(fault.count ?? 1) });
        }
        return sendJson(response, 200, { ok: true });
      }
      if (url.pathname === "/__control/meta" && request.method === "POST") {
        const body = await readJson(request);
        // Catch up first: a stall or a freeze starts from the current head,
        // and ending one applies what was missed.
        meta = { ...meta, stalled: false };
        await sync();
        meta = {
          lagBlocks: Number(body.lagBlocks ?? 0),
          freezeAt: body.freeze ? cursor : body.freezeAt !== undefined ? Number(body.freezeAt) : undefined,
          stalled: Boolean(body.stall),
        };
        return sendJson(response, 200, { ok: true, reportedBlock: reportedBlock() });
      }
      if (url.pathname === "/__control/sync" && request.method === "POST") {
        await sync();
        return sendJson(response, 200, { ok: true, cursor, reportedBlock: reportedBlock() });
      }
      if (url.pathname === "/__control/requests") {
        return sendJson(response, 200, { requests });
      }
      if (url.pathname === "/__control/entity") {
        await sync();
        const type = url.searchParams.get("type") ?? "";
        const id = url.searchParams.get("id") ?? "";
        return sendJson(response, 200, { entity: store.get(type, id) ?? resolveMissing(type, id) ?? null });
      }
      if (url.pathname === "/__control/entities") {
        await sync();
        return sendJson(response, 200, { entities: store.all(url.searchParams.get("type") ?? "") });
      }
      if (url.pathname === "/__control/state") {
        return sendJson(response, 200, {
          cursor,
          reportedBlock: reportedBlock(),
          forkBlock: FORK_BLOCK,
          counts: store.counts(),
          overlayOps: store.overlay.length,
          faults,
          meta,
        });
      }
      sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      sendJson(response, 500, { errors: [{ message: String(error?.message ?? error) }] });
    }
  });

  return {
    server,
    store,
    loadBaseline() {
      const file = baselineFile();
      if (!fs.existsSync(file)) {
        throw new Error(
          `No subgraph baseline for fork block ${FORK_BLOCK} (${file}).\nRecord it with: yarn test:e2e:baseline`,
        );
      }
      const baseline = JSON.parse(fs.readFileSync(file, "utf8"));
      if (baseline.forkBlock !== FORK_BLOCK) {
        throw new Error(`The baseline file is for block ${baseline.forkBlock}, the fork is at ${FORK_BLOCK}.`);
      }
      store.loadBase(baseline.entities);
      return store.counts();
    },
  };
}

/** Starts both fakes. The subgraph fake follows the chain at URLS.anvil. */
export async function startBackends() {
  const s3 = createS3Fake();
  const subgraph = createSubgraphFake({ s3Objects: s3.objects });
  const counts = subgraph.loadBaseline();
  await listen(s3.server, PORTS.s3);
  await listen(subgraph.server, PORTS.subgraph);
  return {
    counts,
    async stop() {
      await Promise.all([close(s3.server), close(subgraph.server)]);
    },
  };
}
