import { IPFS_GATEWAY, URLS } from "../../env/hermetic";

/**
 * Test-side client of the S3 fake that stands in for the Filebase IPFS
 * bucket. Whatever the app pins lands here; the content is served back
 * through the IPFS gateway route (see routes.ts) and read by the subgraph
 * fake as the metadata of profiles and badges.
 */
export type S3Request = { method: string; key: string; bytes?: number; at: number };

async function control<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${URLS.s3}/__control/${path}`, init);
  if (!response.ok) throw new Error(`S3 fake: ${path} failed with ${response.status}`);
  return (await response.json()) as T;
}

export class S3Fake {
  /** Clears the request log and any injected failure. Stored objects are kept: the chain refers to them. */
  async reset() {
    await control("reset", { method: "POST" });
  }

  /** The next `count` uploads fail with this HTTP status (so /api/profile answers 500). */
  async failNext(count = 1, status = 500) {
    await control("fail", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count, status }),
    });
  }

  /** Uploads the app made since the last reset. */
  async requests(): Promise<S3Request[]> {
    return (await control<{ requests: S3Request[] }>("requests")).requests;
  }

  /** Stores JSON directly (for seeding) and returns its CID and gateway URI. */
  async putJson(value: unknown): Promise<{ cid: string; uri: string }> {
    const { cid } = await control<{ cid: string }>("put", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(value),
    });
    return { cid, uri: `${IPFS_GATEWAY}/${cid}` };
  }

  /**
   * Stores any body directly (for seeding), with the content type the
   * gateway will serve it with: a picture, for example.
   */
  async put(body: string | Buffer, contentType: string): Promise<{ cid: string; uri: string }> {
    const { cid } = await control<{ cid: string }>("put", {
      method: "POST",
      headers: { "content-type": contentType },
      body: typeof body === "string" ? body : new Uint8Array(body),
    });
    return { cid, uri: `${IPFS_GATEWAY}/${cid}` };
  }

  /** The stored bytes for a CID, as the gateway would serve them; undefined when unknown. */
  async get(cid: string): Promise<Buffer | undefined> {
    const response = await fetch(`${URLS.s3}/ipfs/${cid}`);
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`S3 fake: reading ${cid} failed with ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  async getJson<T = unknown>(cid: string): Promise<T | undefined> {
    const bytes = await this.get(cid);
    return bytes ? (JSON.parse(bytes.toString("utf8")) as T) : undefined;
  }
}

/** The CID in an IPFS gateway URI or ipfs:// URI. */
export function cidOf(uri: string): string {
  const match = uri.match(/(?:\/ipfs\/|^ipfs:\/\/)([^/?#]+)/);
  if (!match) throw new Error(`Not an IPFS URI: ${uri}`);
  return match[1];
}
