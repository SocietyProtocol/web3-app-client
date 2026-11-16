import { describe, expect, it } from "vitest";
import {
  AbiEvent,
  Address,
  encodeEventTopics,
  encodeAbiParameters,
  Log,
  TransactionReceipt,
  zeroAddress,
} from "viem";
import { SocietyProtocolBadgesABI } from "@/abis/SocietyProtocolBadges";
import {
  decodeBadgeCreatedEvents,
  decodeBadgeModified,
  decodeBadgePermissions,
  decodeEditorsUpdated,
  decodeMintTransfers,
} from "./decodeUtils";
import { decodeBadgeId } from "./utils";

const creator: Address = "0x1111111111111111111111111111111111111111";
const editor: Address = "0x2222222222222222222222222222222222222222";

type EventName = Extract<
  (typeof SocietyProtocolBadgesABI)[number],
  { type: "event" }
>["name"];

// Builds a log as the badges contract emits it: indexed args go to topics,
// the others are ABI-encoded into data.
const makeLog = (eventName: EventName, args: Record<string, unknown>): Log => {
  const event = SocietyProtocolBadgesABI.find(
    (item): item is Extract<typeof item, { type: "event" }> =>
      item.type === "event" && item.name === eventName,
  ) as AbiEvent | undefined;
  if (!event) throw new Error(eventName);
  const nonIndexed = event.inputs.filter((input) => !input.indexed);
  return {
    address: zeroAddress,
    topics: encodeEventTopics({
      abi: [event],
      args: args as never,
    }) as Log["topics"],
    data: encodeAbiParameters(
      nonIndexed,
      nonIndexed.map((input) => args[input.name!]),
    ),
    blockHash: null,
    blockNumber: null,
    logIndex: null,
    transactionHash: null,
    transactionIndex: null,
    removed: false,
  };
};

const receiptOf = (logs: Log[]) => ({ logs }) as unknown as TransactionReceipt;

// The logs of a createBadge transaction, in the order the contract emits
// them: BadgeCreated comes before BadgePermissions and EditorsUpdated.
const createBadgeReceipt = receiptOf([
  makeLog("BadgeCreated", {
    id: BigInt(42),
    name: "Builders",
    isOfficial: false,
    isCommunityBadge: false,
    creator,
  }),
  makeLog("BadgePermissions", {
    id: BigInt(42),
    minters: [BigInt(1)],
    transferers: [BigInt(2), BigInt(3)],
    burners: [],
    editors: [editor],
  }),
  makeLog("EditorsUpdated", { id: BigInt(42), editor, isAllowed: true }),
]);

describe("badge receipt decoders", () => {
  it("returns the BadgePermissions log, not the first log the ABI can decode", () => {
    expect(decodeBadgePermissions(createBadgeReceipt)).toEqual({
      id: BigInt(42),
      minters: [BigInt(1)],
      transferers: [BigInt(2), BigInt(3)],
      burners: [],
      editors: [editor],
    });
  });

  it("returns only the logs of the asked event", () => {
    expect(decodeBadgeCreatedEvents(createBadgeReceipt)).toEqual([
      {
        id: BigInt(42),
        name: "Builders",
        isOfficial: false,
        isCommunityBadge: false,
        creator,
      },
    ]);
    expect(decodeEditorsUpdated(createBadgeReceipt)).toEqual([
      { id: BigInt(42), editor, isAllowed: true },
    ]);
    expect(decodeMintTransfers(createBadgeReceipt)).toEqual([]);
  });

  it("returns null when the receipt has no log of the asked event", () => {
    expect(decodeBadgeModified(createBadgeReceipt)).toBeNull();
    expect(decodeBadgePermissions(receiptOf([]))).toBeNull();
  });

  it("decodes the created badge id from BadgeCreated", () => {
    expect(decodeBadgeId(createBadgeReceipt)).toBe(BigInt(42));
    expect(
      decodeBadgeId(
        receiptOf([
          makeLog("EditorsUpdated", { id: BigInt(7), editor, isAllowed: true }),
        ]),
      ),
    ).toBeNull();
  });
});
