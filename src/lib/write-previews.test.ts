import { describe, expect, it } from "vitest";
import { encodeFunctionData, zeroAddress } from "viem";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import { CommunityRegistryAbi } from "@/abis/CommunityRegistry";
import { PREVIEW_METADATA_URI } from "@/lib/payment-label";
import {
  badgeCreatePreviewArgs,
  badgeEditPreviewArgs,
  communityBadgePreviewArgs,
  communityCreatePreviewArgs,
} from "@/lib/write-previews";

const editor = "0x00000000000000000000000000000000000000Aa";

describe("badgeCreatePreviewArgs", () => {
  it("follows the form as typed", () => {
    expect(
      badgeCreatePreviewArgs({
        name: "Core contributor",
        isOfficial: true,
        hasMetadata: true,
        minters: ["1", "2"],
        transferers: ["3"],
        burners: ["4"],
        editors: [editor],
      }),
    ).toEqual([
      "Core contributor",
      true,
      false,
      zeroAddress,
      PREVIEW_METADATA_URI,
      [BigInt(1), BigInt(2)],
      [BigInt(3)],
      [BigInt(4)],
      [editor.toLowerCase()],
    ]);
  });

  it("sends no URI when nothing will be uploaded, like the real call", () => {
    expect(badgeCreatePreviewArgs({ name: "A" })[4]).toBe("");
  });

  it("stands in for an empty name and drops values the form rejects", () => {
    const args = badgeCreatePreviewArgs({
      name: "",
      minters: ["x", "5"],
      editors: ["not an address"],
    });
    expect(args[0]).toBe("Badge");
    expect(args[5]).toEqual([BigInt(5)]);
    expect(args[8]).toEqual([]);
  });

  it("encodes against the badges ABI", () => {
    expect(() =>
      encodeFunctionData({
        abi: SocietyProtocolBadgesABI,
        functionName: "createBadge",
        args: [...badgeCreatePreviewArgs({ minters: ["1"], editors: [editor] })],
      }),
    ).not.toThrow();
  });
});

describe("communityBadgePreviewArgs", () => {
  it("follows the form and encodes against the registry ABI", () => {
    const args = communityBadgePreviewArgs(BigInt(7), {
      name: "Mod",
      hasMetadata: true,
      minters: ["1"],
      transferers: [],
      burners: ["2"],
    });
    expect(args).toEqual([
      BigInt(7),
      "Mod",
      PREVIEW_METADATA_URI,
      [BigInt(1)],
      [],
      [BigInt(2)],
    ]);
    expect(() =>
      encodeFunctionData({
        abi: CommunityRegistryAbi,
        functionName: "createCommunityBadge",
        args: [...args],
      }),
    ).not.toThrow();
  });
});

describe("communityCreatePreviewArgs", () => {
  it("prices the name and description the user typed", () => {
    const description = "d".repeat(500);
    const args = communityCreatePreviewArgs({ name: "Guild", description });
    expect(args).toEqual([
      "Guild",
      description,
      PREVIEW_METADATA_URI,
      PREVIEW_METADATA_URI,
      PREVIEW_METADATA_URI,
    ]);
    expect(() =>
      encodeFunctionData({
        abi: CommunityRegistryAbi,
        functionName: "createCommunity",
        args: [...args],
      }),
    ).not.toThrow();
  });
});

describe("badgeEditPreviewArgs", () => {
  it("follows the edit form and encodes against the badges ABI", () => {
    const args = badgeEditPreviewArgs(BigInt(3), {
      name: "Renamed",
      isOfficial: false,
      hasMetadata: false,
    });
    expect(args).toEqual([BigInt(3), "Renamed", false, ""]);
    expect(() =>
      encodeFunctionData({
        abi: SocietyProtocolBadgesABI,
        functionName: "modifyBadge",
        args: [...args],
      }),
    ).not.toThrow();
  });
});
