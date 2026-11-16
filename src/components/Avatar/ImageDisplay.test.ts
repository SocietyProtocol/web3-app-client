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

  it("keeps a data-URI image, such as a file just chosen for a preview", () => {
    expect(resolveImageSrc("data:image/png;base64,abc")).toBe(
      "data:image/png;base64,abc",
    );
  });

  it("does not rewrite a data-URI image whose base64 contains /ipfs/", () => {
    const src = "data:image/png;base64,iVBORw0/ipfs/QmNotACid";
    expect(resolveImageSrc(src)).toBe(src);
  });

  it("returns undefined for an empty reference", () => {
    expect(resolveImageSrc(undefined)).toBeUndefined();
    expect(resolveImageSrc(null)).toBeUndefined();
    expect(resolveImageSrc("")).toBeUndefined();
  });
});
