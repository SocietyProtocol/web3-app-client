import { describe, expect, it } from "vitest";
import { isValidElement, ReactNode } from "react";
import { GasEstimation } from "./GasEstimation";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";
import { FREE_LABEL, PAID_LABEL } from "@/lib/payment-label";

// GasEstimation has no hooks, so its element tree can be read without a
// renderer. Text is collected as written; a FormattedNumber shows as
// "<prefix><raw value>", and props such as aria-label are kept.
type Props = Parameters<typeof GasEstimation>[0];

const collect = (node: ReactNode, out: string[]) => {
  if (node === null || node === undefined || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => collect(child, out));
    return;
  }
  if (!isValidElement(node)) return;
  const props = node.props as Record<string, unknown>;
  if (node.type === FormattedNumber) {
    out.push(`${props.prefix ?? ""}${String(props.value)}`);
    return;
  }
  if (typeof props["aria-label"] === "string") {
    out.push(`aria-label=${props["aria-label"]}`);
  }
  collect(props.title as ReactNode, out);
  collect(props.children as ReactNode, out);
};

const render = (props: Props) => {
  const tree = GasEstimation(props);
  if (tree === null) return null;
  const out: string[] = [];
  collect(tree, out);
  return out.join(" ");
};

describe("GasEstimation", () => {
  it("says a sponsored write is free, with no amount", () => {
    const text = render({ routeKind: "sponsored", value: BigInt(0) });
    expect(text).toContain(FREE_LABEL);
    expect(text).not.toContain("$");
  });

  it("says the wallet pays, with the fee, when the wallet acts", () => {
    const text = render({ routeKind: "owner", value: BigInt(150000000) });
    expect(text).toContain(`${PAID_LABEL}, about`);
    expect(text).toContain("$150000000");
  });

  it("says the wallet pays without an amount when the fee is unknown", () => {
    const text = render({
      routeKind: "owner-through-account",
      value: BigInt(5),
      isError: true,
    });
    expect(text).toContain(PAID_LABEL);
    expect(text).not.toContain("about");
    expect(text).not.toContain("$");
  });

  it("shows nothing while the route is unknown or the write is blocked", () => {
    expect(render({ routeKind: undefined, value: BigInt(10) })).toBeNull();
    expect(render({ routeKind: "blocked", value: BigInt(10) })).toBeNull();
  });

  it("keeps who pays in the label and tooltip when compact", () => {
    const text = render({ routeKind: "owner", value: BigInt(1), compact: true });
    expect(text).toContain(`aria-label=${PAID_LABEL}`);
    expect(text).toContain(`${PAID_LABEL}, about`);
  });
});
