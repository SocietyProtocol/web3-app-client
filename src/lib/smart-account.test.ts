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
  LIGHT_ACCOUNT_PROXY_RUNTIME_CODE,
  MAX_PROFILE_URI_LENGTH,
  badgesFunctionNames,
  encodeCreateProfile,
  isSponsoredBadgesCall,
  profileMetadataUriAllowed,
  encodeExecute,
  lightAccountAddress,
  userOperationIsSponsored,
} from "@/lib/smart-account";

const owner = getAddress("0x0000000000000000000000000000000000000001");
const PROFILE_URI =
  "https://ipfs.filebase.io/ipfs/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";
const NEXT_URI = "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
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
    data: encodeCreateProfile(PROFILE_URI),
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
        args: [BigInt(1), NEXT_URI],
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
            data: encodeCreateProfile(PROFILE_URI),
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
      data: encodeCreateProfile(PROFILE_URI),
    });
    expect(userOperationIsSponsored(userOp(auction), 11155111).ok).toBe(false);
  });

  it("refuses value transfers, raw calls, and a non-canonical factory", () => {
    const paid = encodeExecute({
      to: sepoliaBadges,
      value: BigInt(1),
      data: encodeCreateProfile(PROFILE_URI),
    });
    expect(userOperationIsSponsored(userOp(paid), 11155111).ok).toBe(false);
    expect(
      userOperationIsSponsored(
        userOp(encodeCreateProfile(PROFILE_URI)),
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

describe("profile metadata URI", () => {
  it("accepts the gateway and ipfs:// shapes the app writes", () => {
    expect(profileMetadataUriAllowed(PROFILE_URI)).toBe(true);
    expect(profileMetadataUriAllowed(NEXT_URI)).toBe(true);
  });

  it("refuses other hosts, junk CIDs, and oversized URIs", () => {
    expect(
      profileMetadataUriAllowed(PROFILE_URI.replace("ipfs.filebase.io", "ipfsXfilebase.io")),
    ).toBe(false);
    expect(profileMetadataUriAllowed("https://evil.example/ipfs/" + PROFILE_URI.slice(-59))).toBe(
      false,
    );
    expect(profileMetadataUriAllowed("ipfs://profile")).toBe(false);
    const oversized = `ipfs://b${"a".repeat(MAX_PROFILE_URI_LENGTH)}`;
    expect(oversized.length).toBeGreaterThan(MAX_PROFILE_URI_LENGTH);
    expect(profileMetadataUriAllowed(oversized)).toBe(false);
    expect(
      isSponsoredBadgesCall({
        chainId: 11155111,
        to: sepoliaBadges,
        data: encodeCreateProfile(`${PROFILE_URI}${"a".repeat(300)}`),
      }),
    ).toBe(false);
  });

  it("names the badges functions a call reaches", () => {
    const create = encodeExecute({
      to: sepoliaBadges,
      value: BigInt(0),
      data: encodeCreateProfile(PROFILE_URI),
    });
    expect(badgesFunctionNames(create, 11155111)).toEqual(["createProfile"]);
    expect(badgesFunctionNames(create, 1)).toEqual([]);
  });
});

describe("Light Account proxy runtime code", () => {
  it("matches a deployed Light Account v2 on mainnet", () => {
    // eth_getCode of 0xf16850fc91973c6e60792cbbd0f2d6cef8dcbd5c, read 2026-10-19.
    expect(LIGHT_ACCOUNT_PROXY_RUNTIME_CODE).toBe(
      "0x363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3",
    );
  });
});
