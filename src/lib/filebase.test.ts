import { afterEach, describe, expect, it, vi } from "vitest";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

vi.mock("server-only", () => ({}));

import { pinJson, toIndexedCid } from "./filebase";

function setFilebaseEnv() {
  process.env.FILEBASE_KEY = "key";
  process.env.FILEBASE_SECRET = "secret";
  process.env.FILEBASE_BUCKET = "society-outpost";
}

describe("toIndexedCid", () => {
  it("converts Filebase CIDv0 Qm roots to CIDv1 base32", () => {
    const v1 = toIndexedCid("QmbkEAHqF82urRidwJZCScB8hrvi21dMJYHwhrZUqZ74Vc");
    expect(v1.startsWith("bafybei")).toBe(true);
    expect(v1).toHaveLength(59);
  });

  it("keeps CIDv1 Filebase roots", () => {
    const cid = "bafybeiefas6n4iw4johpoo5mmdpdhkeyjleu7bmc5cbxed7d2dgz74wcqy";
    expect(toIndexedCid(cid)).toBe(cid);
  });
});

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
          $metadata: {
            httpHeaders: {
              "x-amz-meta-cid":
                "bafybeiefas6n4iw4johpoo5mmdpdhkeyjleu7bmc5cbxed7d2dgz74wcqy",
            },
          },
        };
      }
      throw new Error("unexpected command");
    });

    await expect(pinJson({ name: "Test" }, { send })).resolves.toBe(
      "bafybeiefas6n4iw4johpoo5mmdpdhkeyjleu7bmc5cbxed7d2dgz74wcqy",
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
        return {
          Metadata: {
            cid: "bafybeiefas6n4iw4johpoo5mmdpdhkeyjleu7bmc5cbxed7d2dgz74wcqy",
          },
        };
      }
      throw new Error("unexpected command");
    });

    const cid = await pinJson({ name: "Test" }, { send });

    expect(cid).toBe(
      "bafybeiefas6n4iw4johpoo5mmdpdhkeyjleu7bmc5cbxed7d2dgz74wcqy",
    );
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
      return {
        Metadata: { cid: "QmbkEAHqF82urRidwJZCScB8hrvi21dMJYHwhrZUqZ74Vc" },
      };
    });

    const cid = await pinJson({ name: "Retry" }, { send });
    expect(cid).toBe(
      toIndexedCid("QmbkEAHqF82urRidwJZCScB8hrvi21dMJYHwhrZUqZ74Vc"),
    );
    expect(heads).toBe(3);
  });

  it("pins data-URI photos as files and stores a gateway URL in JSON", async () => {
    setFilebaseEnv();
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64");

    const send = vi.fn(async (command: unknown) => {
      if (!(command instanceof PutObjectCommand)) {
        throw new Error("unexpected command");
      }
      if (command.input.ContentType === "image/png") {
        return {
          $metadata: {
            httpHeaders: {
              "x-amz-meta-cid":
                "bafkreibj4mwlrvpxohmetqmvneqv35psx2opteabp3q7t5rfvrp4ve2gle",
            },
          },
        };
      }
      if (command.input.ContentType === "application/json") {
        const body = JSON.parse(String(command.input.Body));
        expect(body.imageUrl).toBe(
          "https://ipfs.filebase.io/ipfs/bafkreibj4mwlrvpxohmetqmvneqv35psx2opteabp3q7t5rfvrp4ve2gle",
        );
        expect(body.name).toBe("Ada");
        return {
          $metadata: {
            httpHeaders: {
              "x-amz-meta-cid":
                "bafybeiefas6n4iw4johpoo5mmdpdhkeyjleu7bmc5cbxed7d2dgz74wcqy",
            },
          },
        };
      }
      throw new Error("unexpected content type");
    });

    await expect(
      pinJson(
        { name: "Ada", imageUrl: `data:image/png;base64,${png}` },
        { send },
      ),
    ).resolves.toBe(
      "bafybeiefas6n4iw4johpoo5mmdpdhkeyjleu7bmc5cbxed7d2dgz74wcqy",
    );
    expect(send).toHaveBeenCalledTimes(2);
  });
});
