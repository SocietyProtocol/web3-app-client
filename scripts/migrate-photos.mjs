#!/usr/bin/env node
/**
 * Pin existing data-URI metadata photos as Filebase files and write
 * sha256(dataUri) -> gateway URL mapping for the query gateway.
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const FILEBASE_ENDPOINT = "https://s3.filebase.com";
const IPFS_GATEWAY = "https://ipfs.io/ipfs";
const CID_ATTEMPTS = 8;
const CID_RETRY_MS = 250;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const DATA_URI_PATTERN =
  /^data:(image\/[a-zA-Z0-9+.-]+)(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/]+=*)$/i;
const MIME_EXTENSION = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dataUriKey(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function headerValue(headers, name) {
  if (!headers) return undefined;
  const match = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  return match?.[1];
}

function cidFromResponse(response) {
  if (!response || typeof response !== "object") return undefined;
  return (
    headerValue(response.Metadata, "cid") ||
    headerValue(response.$metadata?.httpHeaders, "x-amz-meta-cid")
  );
}

function collectDataUris(value, found, depth = 0) {
  if (depth > 8) return;
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) found.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectDataUris(item, found, depth + 1);
    return;
  }
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) {
      collectDataUris(child, found, depth + 1);
    }
  }
}

async function putAndReadCid(s3, bucket, key, body, contentType) {
  const put = await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  const putCid = cidFromResponse(put);
  if (putCid) return putCid;
  for (let attempt = 0; attempt < CID_ATTEMPTS; attempt += 1) {
    const head = await s3.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    const cid = cidFromResponse(head);
    if (cid) return cid;
    await sleep(CID_RETRY_MS);
  }
  throw new Error("Filebase did not return an IPFS CID");
}

async function listAllKeys(s3, bucket) {
  const keys = [];
  let token;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: token,
      }),
    );
    for (const item of page.Contents ?? []) {
      if (item.Key) keys.push(item.Key);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function readObjectString(s3, bucket, key) {
  const obj = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  return obj.Body.transformToString();
}

async function main() {
  const key = requireEnv("FILEBASE_KEY");
  const secret = requireEnv("FILEBASE_SECRET");
  const bucket = requireEnv("FILEBASE_BUCKET");
  const s3 = new S3Client({
    endpoint: FILEBASE_ENDPOINT,
    region: "us-east-1",
    credentials: { accessKeyId: key, secretAccessKey: secret },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  const keys = await listAllKeys(s3, bucket);
  const uris = new Set();
  let jsonFiles = 0;
  let unreadable = 0;
  for (const objectKey of keys) {
    let text;
    try {
      text = await readObjectString(s3, bucket, objectKey);
    } catch {
      unreadable += 1;
      continue;
    }
    const trimmed = text.trim();
    const kind = trimmed.startsWith("{") || trimmed.startsWith("[")
      ? "json"
      : trimmed.startsWith("data:")
        ? "data"
        : trimmed.startsWith("\x89PNG") || trimmed.startsWith("\uFFFD")
          ? "bin"
          : "other";
    if (kind !== "json") {
      console.log(
        JSON.stringify({
          kind,
          suffix: objectKey.slice(-32),
          bytes: text.length,
        }),
      );
      continue;
    }
    try {
      collectDataUris(JSON.parse(trimmed), uris);
      jsonFiles += 1;
    } catch {
      // not JSON
    }
  }

  const mapping = {};
  let pinned = 0;
  let skipped = 0;
  for (const uri of uris) {
    const hash = dataUriKey(uri);
    const match = uri.match(DATA_URI_PATTERN);
    if (!match) {
      skipped += 1;
      continue;
    }
    const mime = match[1].toLowerCase();
    const extension = MIME_EXTENSION[mime];
    if (!extension) {
      skipped += 1;
      continue;
    }
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) {
      skipped += 1;
      continue;
    }
    const cid = await putAndReadCid(
      s3,
      bucket,
      `outpost/migrated/${hash}.${extension}`,
      bytes,
      mime,
    );
    mapping[hash] = `${IPFS_GATEWAY}/${cid}`;
    pinned += 1;
  }

  const serialized = `${JSON.stringify(mapping, null, 2)}\n`;
  const clientPath = resolve(
    process.cwd(),
    "src/lib/image-cids.generated.json",
  );
  const gatewayPath = resolve(
    process.cwd(),
    "../web3-app-subgraph/infra/query-gateway/generated/image-cids.json",
  );
  writeFileSync(clientPath, serialized);
  writeFileSync(gatewayPath, serialized);

  console.log(
    JSON.stringify({
      objects: keys.length,
      jsonFiles,
      unreadable,
      dataUris: uris.size,
      pinned,
      skipped,
      mapped: Object.keys(mapping).length,
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "migrate failed");
  process.exitCode = 1;
});
