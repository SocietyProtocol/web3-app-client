import { describe, expect, it } from "vitest";
import {
  encodeFunctionData,
  getAddress,
  toFunctionSelector,
} from "viem";
import { contracts } from "@/consts/contracts";
import {
  ENTRY_POINT_V07,
  LIGHT_ACCOUNT_FACTORY,
  LIGHT_ACCOUNT_IMPLEMENTATION,
  encodeCreateProfile,
  encodeExecute,
  lightAccountAddress,
  userOperationIsSponsored,
} from "@/lib/smart-account";

const owner = getAddress("0x0000000000000000000000000000000000000001");
const sepoliaBadges = contracts.badges.sepolia;

function userOp(callData: `0x${string}`, extra: Record<string, string> = {}) {
  return {
    sender: lightAccountAddress(owner),
    callData,
    ...extra,
  };
}

describe("lightAccountAddress", () => {
  it("matches the on-chain Light Account factory", async () => {
    const data = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "getAddress",
          stateMutability: "view",
          inputs: [
            { name: "owner", type: "address" },
            { name: "salt", type: "uint256" },
          ],
          outputs: [{ type: "address" }],
        },
      ],
      functionName: "getAddress",
      args: [owner, BigInt(0)],
    });
    const implementationCall = toFunctionSelector("ACCOUNT_IMPLEMENTATION()");
    const response = await fetch("https://ethereum-sepolia-rpc.publicnode.com", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: LIGHT_ACCOUNT_FACTORY, data }, "latest"],
      }),
    });
    const body = (await response.json()) as { result?: string; error?: { message: string } };
    expect(body.error, body.error?.message).toBeUndefined();
    expect(getAddress(`0x${body.result!.slice(-40)}`)).toBe(lightAccountAddress(owner));

    const implementation = await fetch("https://ethereum-sepolia-rpc.publicnode.com", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "eth_call",
        params: [
          { to: LIGHT_ACCOUNT_FACTORY, data: implementationCall },
          "latest",
        ],
      }),
    });
    const implementationBody = (await implementation.json()) as { result?: string };
    expect(getAddress(`0x${implementationBody.result!.slice(-40)}`)).toBe(
      LIGHT_ACCOUNT_IMPLEMENTATION,
    );
  });

  it("changes with the owner and stays on salt 0", () => {
    const other = getAddress("0x0000000000000000000000000000000000000002");
    expect(lightAccountAddress(owner)).not.toBe(lightAccountAddress(other));
    expect(lightAccountAddress(owner, BigInt(1))).not.toBe(lightAccountAddress(owner, BigInt(0)));
  });
});

describe("sponsorship allowlist", () => {
  const create = encodeExecute({
    to: sepoliaBadges,
    value: BigInt(0),
    data: encodeCreateProfile("ipfs://profile"),
  });

  it("sponsors profile, profile update, and invite acceptance", () => {
    expect(userOperationIsSponsored(userOp(create), 11155111)).toEqual({ ok: true });

    const update = encodeExecute({
      to: sepoliaBadges,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: [
          {
            type: "function",
            name: "updateProfileURI",
            stateMutability: "nonpayable",
            inputs: [
              { type: "uint256" },
              { type: "string" },
            ],
            outputs: [],
          },
        ],
        functionName: "updateProfileURI",
        args: [BigInt(1), "ipfs://next"],
      }),
    });
    expect(userOperationIsSponsored(userOp(update), 11155111).ok).toBe(true);

    const invite = encodeExecute({
      to: sepoliaBadges,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: [
          {
            type: "function",
            name: "acceptInvite",
            stateMutability: "nonpayable",
            inputs: [
              { type: "address" },
              { type: "uint256" },
              { type: "uint256" },
              { type: "bytes" },
            ],
            outputs: [],
          },
        ],
        functionName: "acceptInvite",
        args: [owner, BigInt(1), BigInt(2), "0x11"],
      }),
    });
    expect(userOperationIsSponsored(userOp(invite), 1).ok).toBe(false);
    expect(
      userOperationIsSponsored(
        userOp(
          encodeExecute({
            to: contracts.badges.mainnet,
            value: BigInt(0),
            data: encodeCreateProfile("ipfs://profile"),
          }),
        ),
        1,
      ).ok,
    ).toBe(true);
  });

  it("refuses mints until a badge id is listed, and refuses other contracts", () => {
    const mint = encodeExecute({
      to: sepoliaBadges,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: [
          {
            type: "function",
            name: "mint",
            stateMutability: "nonpayable",
            inputs: [
              { type: "address" },
              { type: "uint256" },
              { type: "uint256" },
              { type: "bytes" },
            ],
            outputs: [],
          },
        ],
        functionName: "mint",
        args: [owner, BigInt(26), BigInt(1), "0x"],
      }),
    });
    expect(userOperationIsSponsored(userOp(mint), 11155111).ok).toBe(false);
    expect(
      userOperationIsSponsored(userOp(mint), 11155111, { mintBadgeIds: [BigInt(26)] }).ok,
    ).toBe(true);

    const auction = encodeExecute({
      to: contracts.auction.sepolia,
      value: BigInt(0),
      data: encodeCreateProfile("ipfs://profile"),
    });
    expect(userOperationIsSponsored(userOp(auction), 11155111).ok).toBe(false);
  });

  it("refuses value transfers, raw calls, and a non-canonical factory", () => {
    const paid = encodeExecute({
      to: sepoliaBadges,
      value: BigInt(1),
      data: encodeCreateProfile("ipfs://profile"),
    });
    expect(userOperationIsSponsored(userOp(paid), 11155111).ok).toBe(false);
    expect(
      userOperationIsSponsored(
        userOp(encodeCreateProfile("ipfs://profile")),
        11155111,
      ).ok,
    ).toBe(false);

    const factoryData = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "createAccount",
          stateMutability: "nonpayable",
          inputs: [
            { type: "address" },
            { type: "uint256" },
          ],
          outputs: [{ type: "address" }],
        },
      ],
      functionName: "createAccount",
      args: [owner, BigInt(0)],
    });
    expect(
      userOperationIsSponsored(
        userOp(create, { factory: LIGHT_ACCOUNT_FACTORY, factoryData }),
        11155111,
      ),
    ).toEqual({ ok: true });
    expect(
      userOperationIsSponsored(
        userOp(create, {
          factory: LIGHT_ACCOUNT_FACTORY,
          factoryData: encodeFunctionData({
            abi: [
              {
                type: "function",
                name: "createAccount",
                stateMutability: "nonpayable",
                inputs: [
                  { type: "address" },
                  { type: "uint256" },
                ],
                outputs: [{ type: "address" }],
              },
            ],
            functionName: "createAccount",
            args: [owner, BigInt(1)],
          }),
        }),
        11155111,
      ).ok,
    ).toBe(false);
  });

  it("uses EntryPoint 0.7", () => {
    expect(ENTRY_POINT_V07.toLowerCase()).toBe(
      "0x0000000071727de22e5e9d8baf0edac6f37da032",
    );
  });
});
