import { describe, expect, it } from "vitest";
import { hydrateMetadata, requireGraphData } from "./graph-response";

describe("hydrateMetadata", () => {
  it("copies Metadata fields when User display fields are empty", () => {
    const hydrated = hydrateMetadata({
      users: [
        {
          id: "0x1",
          name: null,
          bio: null,
          imageUrl: null,
          metadata: { name: "Ada", bio: "Builder", imageUrl: "data:image/png;base64,abc" },
        },
      ],
    });

    expect(hydrated.users[0]?.name).toBe("Ada");
    expect(hydrated.users[0]?.bio).toBe("Builder");
    expect(hydrated.users[0]?.imageUrl).toBe("data:image/png;base64,abc");
  });

  it("keeps chain fields when they are already set", () => {
    const hydrated = hydrateMetadata({
      name: "On-chain",
      imageUrl: "/badge.svg",
      metadata: { name: "IPFS", imageUrl: "data:image/png;base64,abc" },
    });

    expect(hydrated.name).toBe("On-chain");
    expect(hydrated.imageUrl).toBe("/badge.svg");
  });
});

describe("requireGraphData", () => {
  it("hydrates nested metadata before returning", () => {
    const data = requireGraphData(
      {
        user: {
          name: null,
          metadata: { name: "Ada" },
          invitedBy: { name: null, metadata: { name: "Bob" } },
        },
      },
      "User",
    );

    expect(data.user.name).toBe("Ada");
    expect(data.user.invitedBy.name).toBe("Bob");
  });
});
