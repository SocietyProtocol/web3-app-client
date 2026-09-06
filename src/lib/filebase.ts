"server-only";

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const FILEBASE_ENDPOINT = "https://s3.filebase.com";
const FILEBASE_REGION = "us-east-1";
const CID_ATTEMPTS = 8;
const CID_RETRY_MS = 250;

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

/** Pin JSON to a Filebase IPFS bucket and return the CID. */
export async function pinJson(
  data: Record<string, unknown>,
  client?: FilebaseClient,
): Promise<string> {
  const { bucket } = getFilebaseEnv();
  const s3 = client ?? createFilebaseClient();
  const objectKey = `outpost/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.json`;

  const put = await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: JSON.stringify(data),
      ContentType: "application/json",
    }),
  );

  const putCid = cidFromResponse(put);
  if (putCid) {
    return putCid;
  }

  for (let attempt = 0; attempt < CID_ATTEMPTS; attempt += 1) {
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: objectKey,
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
