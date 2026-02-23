import { describe, it, expect } from "vitest";
import { mainnet, sepolia } from "wagmi/chains";
import { getExplorerLinkBuilder } from "../explorer";
import { Hex } from "viem";
import { URLS } from "../../consts/urls";

describe("getExplorerLinkBuilder", () => {
  it("builds tx and address links for mainnet", () => {
    const builder = getExplorerLinkBuilder(mainnet.id);
    const tx = "0xabc123" as Hex;
    const addr = "0x1111222233334444555566667777888899990000" as Hex;

    expect(builder({ tx })).toBe(`${URLS.ETHERSCAN_MAINNET}/tx/${tx}`);
    expect(builder({ address: addr })).toBe(
      `${URLS.ETHERSCAN_MAINNET}/address/${addr}`,
    );
  });

  it("builds tx and address links for sepolia", () => {
    const builder = getExplorerLinkBuilder(sepolia.id);
    const tx = "0xdef456" as Hex;
    const addr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Hex;

    expect(builder({ tx })).toBe(`${URLS.ETHERSCAN_SEPOLIA}/tx/${tx}`);
    expect(builder({ address: addr })).toBe(
      `${URLS.ETHERSCAN_SEPOLIA}/address/${addr}`,
    );
  });

  it("falls back to mainnet when chain is unknown", () => {
    const builder = getExplorerLinkBuilder(999999);
    const tx = "0xfeed" as Hex;
    expect(builder({ tx })).toBe(`${URLS.ETHERSCAN_MAINNET}/tx/${tx}`);
  });
});
