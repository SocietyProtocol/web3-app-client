#!/usr/bin/env node
/**
 * Pin existing data-URI metadata photos as Filebase files and write
 * sha256(dataUri) -> gateway URL mapping for the query gateway.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
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
const GRAPHQL_URL =
  process.env.GRAPHQL_URL || "https://app.societyprotocol.io/api/graphql";
const CID_ATTEMPTS = 8;
const CID_RETRY_MS = 250;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const BADGES_QUERY =
  "query Badges($first: Int!, $skip: Int!, $orderBy: Badge_orderBy!, $orderDirection: OrderDirection!, $where: Badge_filter) {\n  badges(\n    first: $first\n    skip: $skip\n    orderBy: $orderBy\n    orderDirection: $orderDirection\n    where: $where\n  ) {\n    id\n    name\n    description\n    isOfficial\n    isCommunity\n    uri\n    imageUrl\n    metadata {\n      description\n      imageUrl\n    }\n    creatorAddress\n    profileUser {\n      name\n      metadata {\n        name\n      }\n    }\n    community {\n      id\n      name\n    }\n    createdBy {\n      id\n      name\n      bio\n      imageUrl\n      metadata {\n        name\n        bio\n        imageUrl\n      }\n    }\n  }\n}\n";
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

function cidFromUri(uri) {
  const match = String(uri).match(/\/ipfs\/([^/?#]+)/);
  if (match) return match[1];
  if (String(uri).startsWith("ipfs://")) return String(uri).slice(7);
  return null;
}

async function fetchIpfsJson(uri) {
  const cid = cidFromUri(uri);
  if (!cid) return null;
  const urls = [
    `${IPFS_GATEWAY}/${cid}`,
    `https://dweb.link/ipfs/${cid}`,
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) continue;
      const text = await response.text();
      const trimmed = text.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) continue;
      return JSON.parse(trimmed);
    } catch {
      // try the next gateway
    }
  }
  return null;
}

async function collectGraphqlUris() {
  const uris = new Set();
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: BADGES_QUERY,
      operationName: "Badges",
      variables: {
        first: 200,
        skip: 0,
        orderBy: "id",
        orderDirection: "asc",
        where: {},
      },
    }),
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  for (const badge of body.data?.badges ?? []) {
    if (typeof badge.uri === "string" && badge.uri) uris.add(badge.uri);
  }
  return uris;
}

function loadExistingMapping(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // start from an empty mapping
  }
  return {};
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
  let ipfsJson = 0;
  let ipfsFailed = 0;
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

  const metadataUris = await collectGraphqlUris();
  for (const metadataUri of metadataUris) {
    const parsed = await fetchIpfsJson(metadataUri);
    if (!parsed) {
      ipfsFailed += 1;
      continue;
    }
    collectDataUris(parsed, uris);
    ipfsJson += 1;
  }

  const clientPath = resolve(
    process.cwd(),
    "src/lib/image-cids.generated.json",
  );
  const gatewayPath = resolve(
    process.cwd(),
    "../web3-app-subgraph/infra/query-gateway/generated/image-cids.json",
  );
  const mapping = loadExistingMapping(clientPath);
  let pinned = 0;
  let reused = 0;
  let skipped = 0;
  for (const uri of uris) {
    const hash = dataUriKey(uri);
    if (mapping[hash]) {
      reused += 1;
      continue;
    }
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
    console.log(
      JSON.stringify({
        pinned,
        hash: hash.slice(0, 12),
        mime,
        bytes: bytes.byteLength,
      }),
    );
  }

  const serialized = `${JSON.stringify(mapping, null, 2)}\n`;
  writeFileSync(clientPath, serialized);
  writeFileSync(gatewayPath, serialized);

  console.log(
    JSON.stringify({
      objects: keys.length,
      jsonFiles,
      unreadable,
      metadataUris: metadataUris.size,
      ipfsJson,
      ipfsFailed,
      dataUris: uris.size,
      pinned,
      reused,
      skipped,
      mapped: Object.keys(mapping).length,
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "migrate failed");
  process.exitCode = 1;
});
