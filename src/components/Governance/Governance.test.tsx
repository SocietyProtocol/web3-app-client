import { describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";

// Shallow render: Governance is called as a plain function and the element
// tree it returns is inspected. (react-dom/server cannot be used here, the
// repo pins react and react-dom to different patch versions.)
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useMemo: <T,>(factory: () => T) => factory(),
}));

const badgeQuery = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("@/data/badges/useBadge", () => ({
  useBadge: () => badgeQuery.current,
}));
vi.mock("@/data/badges/useBadgeQuantities", () => ({
  useBadgeHolderBalances: () => ({ balances: new Map() }),
  useBadgeTotalSupplies: () => ({ supplies: new Map() }),
}));
vi.mock("@/hooks/useChainVar", () => ({ useChainVar: () => "1" }));
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/components/MarkdownRenderer/MarkdownRenderer", () => ({
  MarkdownRenderer: () => null,
}));
vi.mock("../User/UserList", () => ({ UserList: () => null }));

import { Governance } from "./Governance";
import { ErrorDisplay } from "../ErrorBoundary/ErrorDisplay";
import { UserList } from "../User/UserList";

const elements = (node: ReactNode): ReactElement<Record<string, unknown>>[] => {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [
    node,
    ...Object.values(node.props).flatMap((prop) => elements(prop as ReactNode)),
  ];
};

const render = (query: Record<string, unknown>) => {
  badgeQuery.current = { isLoading: false, isError: false, error: null, refetch: vi.fn(), ...query };
  const tree = elements(Governance());
  return {
    errorDisplay: tree.find((element) => element.type === ErrorDisplay),
    userList: tree.find((element) => element.type === UserList),
  };
};

describe("Governance", () => {
  it("shows an error with a retry, not an empty list, when the Badge query fails", () => {
    const error = new Error("Badge data is unavailable. Please try again.");
    const refetch = vi.fn();

    const { errorDisplay, userList } = render({ data: undefined, isError: true, error, refetch });

    expect(userList).toBeUndefined();
    expect(errorDisplay?.props.error).toBe(error);
    const retry = elements(errorDisplay?.props.action as ReactNode)[0];
    expect(retry.props.children).toBe("Retry");
    (retry.props.onClick as () => void)();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("lists the Governors, with an empty state, when the query succeeds", () => {
    const { errorDisplay, userList } = render({ data: { badge: { holders: [] } } });

    expect(errorDisplay).toBeUndefined();
    expect(userList?.props.users).toEqual([]);
    expect(userList?.props.noUsersFoundText).toBe("No governors found");
  });

  it("keeps the Governors it has when a later refetch fails", () => {
    const holders = [{ id: "0x1" }];

    const { errorDisplay, userList } = render({ data: { badge: { holders } }, isError: true, error: new Error("x") });

    expect(errorDisplay).toBeUndefined();
    expect(userList?.props.users).toEqual(holders);
  });
});
