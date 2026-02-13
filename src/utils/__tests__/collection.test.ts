import { describe, it, expect } from "vitest";
import { get, searchInCollection, uniq } from "../collection";

type Item = {
  id: string;
  name?: string;
  meta?: {
    tag?: string;
    nested?: { value?: string };
  };
};

const items: Item[] = [
  { id: "1", name: "Alice", meta: { tag: "admin", nested: { value: "foo" } } },
  { id: "2", name: "Bob", meta: { tag: "user", nested: { value: "bar" } } },
  { id: "3", name: "Carol", meta: { tag: "admin", nested: { value: "baz" } } },
];

describe("get", () => {
  it("retrieves nested values by path", () => {
    const v = get(items[0], "meta.nested.value");
    expect(v).toBe("foo");
  });

  it("returns default when path does not exist", () => {
    // @ts-expect-error testing missing path
    const v = get(items[0], "meta.missing.value", "default");
    expect(v).toBe("default");
  });
});

describe("searchInCollection", () => {
  it("finds items by top-level field (case-insensitive)", () => {
    const res = searchInCollection(items, "alice", ["name"]);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("1");
  });

  it("searches nested fields using dot notation", () => {
    const res = searchInCollection(items, "bar", ["meta.nested.value"]);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("2");
  });
});

describe("uniq", () => {
  it("removes duplicates and preserves order", () => {
    const arr = ["a", "b", "a", "c", "b"] as const;
    const result = uniq(Array.from(arr));
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty input", () => {
    expect(uniq([])).toEqual([]);
  });

  it("keeps all elements when already unique", () => {
    expect(uniq(["x", "y", "z"])).toEqual(["x", "y", "z"]);
  });
});
