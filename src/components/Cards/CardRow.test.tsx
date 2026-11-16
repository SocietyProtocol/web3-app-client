import { describe, expect, it } from "vitest";
import { isValidElement, type ReactNode } from "react";
import { CardRow } from "./CardRow";

// Shallow render: CardRow has no hooks, so it is called as a plain function
// and the texts of the element tree it returns are collected. (react-dom/server
// cannot be used here, the repo pins react and react-dom to different patch
// versions.)
const texts = (node: ReactNode): string[] => {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(texts);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return Object.values(node.props).flatMap((prop) => texts(prop as ReactNode));
};

const render = (props: { loading?: boolean; items?: { id: string }[] }) =>
  texts(
    CardRow({
      title: "Governors",
      noneFoundText: "No governors found",
      renderItem: (item) => (item.loading ? "skeleton" : item.id),
      ...props,
    }),
  );

describe("CardRow", () => {
  it("shows skeletons, not the none-found text, while the items are loading", () => {
    const shown = render({ loading: true, items: [] });
    expect(shown).not.toContain("No governors found");
    expect(shown.filter((text) => text === "skeleton")).toHaveLength(4);
  });

  it("says that none were found once loaded without items", () => {
    expect(render({ loading: false, items: [] })).toContain("No governors found");
  });

  it("shows the items once loaded", () => {
    const shown = render({ items: [{ id: "a" }, { id: "b" }] });
    expect(shown).toEqual(expect.arrayContaining(["a", "b"]));
    expect(shown).not.toContain("No governors found");
  });
});
