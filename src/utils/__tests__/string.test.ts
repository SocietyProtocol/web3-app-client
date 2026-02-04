import { describe, it, expect } from "vitest";
import { truncateAddress, isValidUrl, isEqualCaseInsensitive } from "../string";

describe("string utils", () => {
  it("truncateAddress returns truncated address when long", () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    const result = truncateAddress(addr);
    expect(result).toBe(`${addr.slice(0, 6)}...${addr.slice(-6)}`);
  });

  it("truncateAddress returns original when short", () => {
    const short = "0x12345";
    expect(truncateAddress(short)).toBe(short);
  });

  it("isValidUrl recognizes http and https and rejects others", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
    expect(isValidUrl("https://example.com/path?x=1")).toBe(true);
    expect(isValidUrl("ftp://example.com")).toBe(false);
    expect(isValidUrl("not-a-url")).toBe(false);
  });

  it("isEqualCaseInsensitive compares strings ignoring case", () => {
    expect(isEqualCaseInsensitive("Hello", "hello")).toBe(true);
    expect(isEqualCaseInsensitive("HELLO", "hello")).toBe(true);
    expect(isEqualCaseInsensitive("Hello", "World")).toBe(false);
    expect(isEqualCaseInsensitive("", "")).toBe(true);
  });
});
