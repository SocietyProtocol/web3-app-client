import { isValidElement, ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// No DOM renderer runs in this suite (environment "node"), so the components
// are called as plain functions: their React hooks are replaced by trivial
// ones and the returned element tree is inspected.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useMemo: <T,>(factory: () => T) => factory(),
    useState: <T,>(initial: T) => [initial, () => {}],
  };
});

const wallet = vi.hoisted(() => ({
  isConnected: false,
  isWrongNetwork: false,
}));

vi.mock("@/atoms/wagmiReady", () => ({ useWagmiReady: () => true }));
vi.mock("@/hooks/useOutpostAccount", () => ({
  useOutpostAccount: () => ({
    address: wallet.isConnected
      ? "0x0000000000000000000000000000000000000001"
      : undefined,
    isConnected: wallet.isConnected,
  }),
}));
vi.mock("@/hooks/useCheckWrongNetwork", () => ({
  useCheckWrongNetwork: () => ({ isWrongNetwork: wallet.isWrongNetwork }),
}));
vi.mock("@/data/users/useUserQuery", () => ({
  useUserQuery: () => ({ isLoading: false, data: undefined }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("../Bubbles/ConnectWalletBubble", () => ({
  ConnectWalletBubble: () => null,
}));
vi.mock("../Bubbles/WrongNetworkBubble", () => ({
  WrongNetworkBubble: () => null,
}));
vi.mock("../Bubbles/AccountSetupBubble", () => ({
  AccountSetupBubble: () => null,
}));
vi.mock("./MintBadge/MintTab", () => ({ MintTab: () => null }));
vi.mock("./TransferTab/TransferTab", () => ({ TransferTab: () => null }));
vi.mock("./BurnBadge/BurnTab", () => ({ BurnTab: () => null }));

const { BadgeActions } = await import("./BadgeActions");
const { ContentGuard } = await import("../Bubbles/ContentGuard");
const { ConnectWalletBubble } = await import("../Bubbles/ConnectWalletBubble");
const { WrongNetworkBubble } = await import("../Bubbles/WrongNetworkBubble");
const { MintTab } = await import("./MintBadge/MintTab");

type AnyElement = ReactElement<Record<string, unknown>>;

const findAll = (node: ReactNode, type: unknown): AnyElement[] => {
  if (Array.isArray(node)) return node.flatMap((n) => findAll(n, type));
  if (!isValidElement(node)) return [];
  const element = node as AnyElement;
  const own = element.type === type ? [element] : [];
  return [...own, ...findAll(element.props.children as ReactNode, type)];
};

/** Renders BadgeActions and the ContentGuard it holds, one level deep. */
const render = (permissions: { canMint: boolean }) => {
  const tree = BadgeActions({
    id: "1",
    canMint: permissions.canMint,
    canBurn: false,
    canTransfer: false,
  });
  const guards = findAll(tree, ContentGuard);
  expect(guards).toHaveLength(1);
  const guarded = ContentGuard(
    guards[0].props as Parameters<typeof ContentGuard>[0],
  ) as ReactNode;
  return {
    connectPrompts: findAll(guarded, ConnectWalletBubble),
    wrongNetworkPrompts: findAll(guarded, WrongNetworkBubble),
    mintTabs: findAll(guarded, MintTab),
  };
};

const CONNECT = "Connect your wallet to perform badge actions";

describe("BadgeActions", () => {
  beforeEach(() => {
    wallet.isConnected = false;
    wallet.isWrongNetwork = false;
  });

  it("asks a logged-out visitor to connect a wallet", () => {
    const view = render({ canMint: false });
    expect(view.connectPrompts).toHaveLength(1);
    expect(view.connectPrompts[0].props.message).toBe(CONNECT);
    expect(view.mintTabs).toHaveLength(0);
  });

  it("shows no prompt and nothing to act with to a connected visitor without permissions", () => {
    wallet.isConnected = true;
    const view = render({ canMint: false });
    expect(view.connectPrompts).toHaveLength(0);
    expect(view.wrongNetworkPrompts).toHaveLength(0);
    expect(view.mintTabs).toHaveLength(0);
  });

  it("does not ask a connected visitor without permissions to switch network", () => {
    wallet.isConnected = true;
    wallet.isWrongNetwork = true;
    const view = render({ canMint: false });
    expect(view.connectPrompts).toHaveLength(0);
    expect(view.wrongNetworkPrompts).toHaveLength(0);
  });

  it("shows the Mint tab to a connected minter on the right network", () => {
    wallet.isConnected = true;
    const view = render({ canMint: true });
    expect(view.mintTabs).toHaveLength(1);
    expect(view.connectPrompts).toHaveLength(0);
  });

  it("asks a minter on the wrong network to switch", () => {
    wallet.isConnected = true;
    wallet.isWrongNetwork = true;
    const view = render({ canMint: true });
    expect(view.wrongNetworkPrompts).toHaveLength(1);
    expect(view.mintTabs).toHaveLength(0);
  });
});
