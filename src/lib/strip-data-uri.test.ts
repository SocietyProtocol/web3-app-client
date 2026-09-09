import { describe, expect, it } from "vitest";
import { dataUriKey, stripDataUriImages } from "./strip-data-uri";
import imageEntityCids from "./image-entity-cids.generated.json";

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

  it("fills null photos from the entity id map and copies them onto metadata", () => {
    const entityId = Object.keys(imageEntityCids).find((key) =>
      key.startsWith("0x"),
    );
    expect(entityId).toBeDefined();
    const mapped = imageEntityCids[entityId as keyof typeof imageEntityCids];

    const stripped = stripDataUriImages({
      users: [
        {
          id: entityId,
          name: "Ada",
          imageUrl: null,
          metadata: { name: "Ada", imageUrl: null },
          profile: { id: "48" },
        },
      ],
    });

    expect(stripped.users[0]?.imageUrl).toBe(mapped);
    expect(stripped.users[0]?.metadata.imageUrl).toBe(mapped);
    expect(stripped.users[0]?.profile).toEqual({ id: "48" });
  });
});
