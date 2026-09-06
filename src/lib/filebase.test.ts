import { afterEach, describe, expect, it, vi } from "vitest";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

vi.mock("server-only", () => ({}));

import { pinJson } from "./filebase";

function setFilebaseEnv() {
  process.env.FILEBASE_KEY = "key";
  process.env.FILEBASE_SECRET = "secret";
  process.env.FILEBASE_BUCKET = "society-outpost";
}

describe("pinJson", () => {
  afterEach(() => {
    delete process.env.FILEBASE_KEY;
    delete process.env.FILEBASE_SECRET;
    delete process.env.FILEBASE_BUCKET;
  });

  it("throws when Filebase env vars are missing", async () => {
    await expect(pinJson({ name: "Test" }, { send: vi.fn() })).rejects.toThrow(
      /FILEBASE_KEY/,
    );
  });

  it("returns the CID from PutObject headers when present", async () => {
    setFilebaseEnv();

    const send = vi.fn(async (command: unknown) => {
      if (command instanceof PutObjectCommand) {
        return {
          $metadata: { httpHeaders: { "x-amz-meta-cid": "bafyfromput" } },
        };
      }
      throw new Error("unexpected command");
    });

    await expect(pinJson({ name: "Test" }, { send })).resolves.toBe(
      "bafyfromput",
    );
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("uploads JSON and returns the Filebase CID from HeadObject", async () => {
    setFilebaseEnv();

    const send = vi.fn(async (command: unknown) => {
      if (command instanceof PutObjectCommand) {
        return {};
      }
      if (command instanceof HeadObjectCommand) {
        return { Metadata: { cid: "bafytestcid" } };
      }
      throw new Error("unexpected command");
    });

    const cid = await pinJson({ name: "Test" }, { send });

    expect(cid).toBe("bafytestcid");
    expect(send).toHaveBeenCalledTimes(2);
    const put = send.mock.calls[0]?.[0] as PutObjectCommand;
    expect(put).toBeInstanceOf(PutObjectCommand);
    expect(put.input.Bucket).toBe("society-outpost");
    expect(put.input.ContentType).toBe("application/json");
    expect(JSON.parse(String(put.input.Body))).toEqual({ name: "Test" });
    expect(String(put.input.Key)).toMatch(/^outpost\/\d{4}-\d{2}-\d{2}\//);
  });

  it("retries HeadObject until the CID header appears", async () => {
    setFilebaseEnv();

    let heads = 0;
    const send = vi.fn(async (command: unknown) => {
      if (command instanceof PutObjectCommand) {
        return {};
      }
      heads += 1;
      if (heads < 3) {
        return { Metadata: {} };
      }
      return { Metadata: { cid: "QmRetry" } };
    });

    await expect(pinJson({ name: "Retry" }, { send })).resolves.toBe("QmRetry");
    expect(heads).toBe(3);
  });
});
