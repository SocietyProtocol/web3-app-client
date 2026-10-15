import { describe, expect, it } from "vitest";
import { encodeCreateProfile, encodeExecute, lightAccountAddress } from "@/lib/smart-account";
import { contracts } from "@/consts/contracts";
import { reviewAaRpc, pimlicoRpcUrl } from "@/lib/pimlico-proxy";
import { getAddress } from "viem";

const owner = getAddress("0x0000000000000000000000000000000000000001");

describe("reviewAaRpc", () => {
  const callData = encodeExecute({
    to: contracts.badges.sepolia,
    value: BigInt(0),
    data: encodeCreateProfile("ipfs://profile"),
  });

  it("forwards an allowlisted sponsorship and pins the policy id", () => {
    const reviewed = reviewAaRpc({
      chainId: 11155111,
      policyId: "sp_eager_ricochet",
      request: {
        jsonrpc: "2.0",
        id: 7,
        method: "pm_sponsorUserOperation",
        params: [
          { sender: lightAccountAddress(owner), callData },
          "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
          { sponsorshipPolicyId: "sp_other" },
        ],
      },
    });
    expect(reviewed.ok).toBe(true);
    if (!reviewed.ok) return;
    expect(reviewed.body.params?.[2]).toEqual({
      sponsorshipPolicyId: "sp_eager_ricochet",
    });
  });

  it("rejects other contracts, other chains, and unknown methods", () => {
    const blocked = reviewAaRpc({
      chainId: 11155111,
      request: {
        method: "eth_sendUserOperation",
        params: [
          {
            sender: lightAccountAddress(owner),
            callData: encodeExecute({
              to: contracts.auction.sepolia,
              value: BigInt(0),
              data: "0x1234",
            }),
          },
        ],
      },
    });
    expect(blocked.ok).toBe(false);

    expect(reviewAaRpc({ chainId: 8453, request: { method: "eth_chainId" } }).ok).toBe(
      false,
    );
    expect(
      reviewAaRpc({
        chainId: 1,
        request: { method: "eth_getBalance", params: [] },
      }).ok,
    ).toBe(false);
  });

  it("keeps the API key in the upstream URL only", () => {
    const url = new URL(pimlicoRpcUrl(11155111, "pim_test_key"));
    expect(url.origin + url.pathname).toBe(
      "https://api.pimlico.io/v2/11155111/rpc",
    );
    expect(url.searchParams.get("apikey")).toBe("pim_test_key");
  });
});
