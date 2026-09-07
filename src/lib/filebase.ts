"server-only";

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

import { URLS } from "@/consts/urls";

const FILEBASE_ENDPOINT = "https://s3.filebase.com";
const FILEBASE_REGION = "us-east-1";
const CID_ATTEMPTS = 8;
const CID_RETRY_MS = 250;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const DATA_URI_PATTERN =
  /^data:(image\/[a-zA-Z0-9+.-]+)(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/]+=*)$/i;
const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export type FilebaseClient = {
  send: (command: unknown) => Promise<unknown>;
};

export function getFilebaseEnv() {
  const key = process.env.FILEBASE_KEY;
  const secret = process.env.FILEBASE_SECRET;
  const bucket = process.env.FILEBASE_BUCKET;

  if (!key) {
    throw new Error("FILEBASE_KEY environment variable is not set");
  }
  if (!secret) {
    throw new Error("FILEBASE_SECRET environment variable is not set");
  }
  if (!bucket) {
    throw new Error("FILEBASE_BUCKET environment variable is not set");
  }

  return { key, secret, bucket };
}

export function createFilebaseClient(): S3Client {
  const { key, secret } = getFilebaseEnv();

  return new S3Client({
    endpoint: FILEBASE_ENDPOINT,
    region: FILEBASE_REGION,
    credentials: {
      accessKeyId: key,
      secretAccessKey: secret,
    },
    // IPFS buckets do not support S3 checksum headers.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function headerValue(
  headers: Record<string, string> | undefined,
  name: string,
): string | undefined {
  if (!headers) {
    return undefined;
  }
  const match = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  return match?.[1];
}

function cidFromResponse(response: unknown): string | undefined {
  if (!response || typeof response !== "object") {
    return undefined;
  }
  const rec = response as {
    Metadata?: Record<string, string>;
    $metadata?: { httpHeaders?: Record<string, string> };
  };
  return (
    headerValue(rec.Metadata, "cid") ||
    headerValue(rec.$metadata?.httpHeaders, "x-amz-meta-cid")
  );
}

function objectKey(extension: string) {
  return `outpost/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
}

async function putAndReadCid(
  s3: FilebaseClient,
  input: {
    Bucket: string;
    Key: string;
    Body: Buffer | string;
    ContentType: string;
  },
): Promise<string> {
  const put = await s3.send(new PutObjectCommand(input));
  const putCid = cidFromResponse(put);
  if (putCid) {
    return putCid;
  }

  for (let attempt = 0; attempt < CID_ATTEMPTS; attempt += 1) {
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: input.Bucket,
        Key: input.Key,
      }),
    );
    const cid = cidFromResponse(head);
    if (cid) {
      return cid;
    }
    await sleep(CID_RETRY_MS);
  }

  throw new Error("Filebase did not return an IPFS CID");
}

function extensionForMime(mime: string): string {
  return MIME_EXTENSION[mime.toLowerCase()] ?? "bin";
}

/** Pin raw bytes to Filebase IPFS and return the CID. */
export async function pinBytes(
  body: Buffer,
  contentType: string,
  extension: string,
  client?: FilebaseClient,
): Promise<string> {
  const { bucket } = getFilebaseEnv();
  const s3 = client ?? createFilebaseClient();
  return putAndReadCid(s3, {
    Bucket: bucket,
    Key: objectKey(extension),
    Body: body,
    ContentType: contentType,
  });
}

async function pinDataUriImage(
  value: string,
  s3: FilebaseClient,
): Promise<string> {
  const match = value.match(DATA_URI_PATTERN);
  if (!match) {
    throw new Error("Image data URI is invalid");
  }
  const mime = match[1].toLowerCase();
  if (!MIME_EXTENSION[mime]) {
    throw new Error("Image type is not allowed");
  }
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image is empty or larger than 2MB");
  }
  const cid = await pinBytes(bytes, mime, extensionForMime(mime), s3);
  return `${URLS.IPFS_GATEWAY}/${cid}`;
}

export async function rewriteDataUriImages(
  value: unknown,
  client?: FilebaseClient,
  depth = 0,
): Promise<unknown> {
  if (depth > 8) {
    return value;
  }
  if (typeof value === "string") {
    if (!value.startsWith("data:image/")) {
      return value;
    }
    const s3 = client ?? createFilebaseClient();
    return pinDataUriImage(value, s3);
  }
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) => rewriteDataUriImages(item, client, depth + 1)),
    );
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const next: Record<string, unknown> = {};
    for (const [key, child] of entries) {
      next[key] = await rewriteDataUriImages(child, client, depth + 1);
    }
    return next;
  }
  return value;
}

/** Pin JSON to a Filebase IPFS bucket and return the CID. */
export async function pinJson(
  data: Record<string, unknown>,
  client?: FilebaseClient,
): Promise<string> {
  const { bucket } = getFilebaseEnv();
  const s3 = client ?? createFilebaseClient();
  const rewritten = (await rewriteDataUriImages(data, s3)) as Record<
    string,
    unknown
  >;

  return putAndReadCid(s3, {
    Bucket: bucket,
    Key: objectKey("json"),
    Body: JSON.stringify(rewritten),
    ContentType: "application/json",
  });
}
