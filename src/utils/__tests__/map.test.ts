import { describe, it, expect } from "vitest";
import { upsertIntoMapByKey } from "../map";

interface Item {
  id: string;
  name: string;
}

describe("upsertIntoMapByKey", () => {
  it("inserts elements into an empty map", () => {
    const prev = new Map<string, Item>();
    const items: readonly Item[] = [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ];

    const next = upsertIntoMapByKey(prev, items, (i) => i.id);

    expect(next.size).toBe(2);
    expect(next.get("a")?.name).toBe("Alice");
    expect(next.get("b")?.name).toBe("Bob");
    // original map not mutated
    expect(prev.size).toBe(0);
  });

  it("updates existing entries and preserves others", () => {
    const prev = new Map<string, Item>([
      ["a", { id: "a", name: "Alice" }],
      ["c", { id: "c", name: "Carol" }],
    ]);

    const items: readonly Item[] = [
      { id: "a", name: "Alice Updated" },
      { id: "b", name: "Bob" },
    ];

    const next = upsertIntoMapByKey(prev, items, (i) => i.id);

    expect(next.size).toBe(3);
    expect(next.get("a")?.name).toBe("Alice Updated");
    expect(next.get("b")?.name).toBe("Bob");
    expect(next.get("c")?.name).toBe("Carol");

    // prev should remain unchanged
    expect(prev.get("a")?.name).toBe("Alice");
    expect(prev.size).toBe(2);
  });
});
