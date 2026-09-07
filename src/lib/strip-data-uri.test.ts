import { describe, expect, it } from "vitest";
import { dataUriKey, stripDataUriImages } from "./strip-data-uri";

describe("stripDataUriImages", () => {
  it("replaces data-URI strings with null and keeps HTTP URLs", () => {
    const stripped = stripDataUriImages({
      users: [
        {
          name: "Ada",
          imageUrl: "data:image/png;base64,abc",
          metadata: {
            imageUrl: "https://ipfs.io/ipfs/bafytest",
          },
        },
      ],
    });

    expect(stripped.users[0]?.imageUrl).toBeNull();
    // unmapped data URIs stay dropped so list payloads cannot grow again
    expect(stripped.users[0]?.metadata.imageUrl).toBe(
      "https://ipfs.io/ipfs/bafytest",
    );
    expect(stripped.users[0]?.name).toBe("Ada");
  });
});
