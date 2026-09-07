import { describe, expect, it } from "vitest";
import { resolveImageSrc } from "./ImageDisplay";

describe("resolveImageSrc", () => {
  it("rewrites ipfs.io photo URLs onto the Filebase gateway", () => {
    expect(
      resolveImageSrc("https://ipfs.io/ipfs/Qmf6wEu7G53TCwfb4buUWuLE1dZ4fxV36NaVkgKBbsb78A"),
    ).toBe(
      "https://ipfs.filebase.io/ipfs/Qmf6wEu7G53TCwfb4buUWuLE1dZ4fxV36NaVkgKBbsb78A",
    );
  });

  it("rewrites ipfs:// CIDs onto the Filebase gateway", () => {
    expect(resolveImageSrc("ipfs://bafytestcid")).toBe(
      "https://ipfs.filebase.io/ipfs/bafytestcid",
    );
  });

  it("drops inlined data-URI photos", () => {
    expect(resolveImageSrc("data:image/png;base64,abc")).toBeUndefined();
  });
});
