import { describe, expect, it } from "vitest";
import { profileView } from "./profileView";

const base = { wagmiReady: true, isLoading: false, isError: false, hasData: true };

describe("profileView", () => {
  it("is loading until wagmi is ready", () => {
    expect(profileView({ ...base, wagmiReady: false })).toBe("loading");
  });

  it("is loading while the User query loads", () => {
    expect(profileView({ ...base, isLoading: true, hasData: false })).toBe("loading");
  });

  it("is an error when the User query failed without data", () => {
    expect(profileView({ ...base, isError: true, hasData: false })).toBe("error");
  });

  it("keeps showing data that a failed refetch left in the cache", () => {
    expect(profileView({ ...base, isError: true, hasData: true })).toBe("content");
  });

  it("shows the content once the query has succeeded", () => {
    expect(profileView(base)).toBe("content");
  });
});
