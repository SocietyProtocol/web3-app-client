import { isAddressEqual, parseEventLogs, type TransactionReceipt } from "viem";
import { SocietyProtocolBadgesABI } from "../../../src/abis/SocietyProtocolBadges";
import { BADGES_ADDRESS } from "../../env/hermetic";

/**
 * What the badge-create specs share. Not a spec: files here that do not end
 * in .spec.ts are not collected.
 */

/** A valid 1x1 PNG. */
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export const TWO_MEGABYTES = 2 * 1024 * 1024;

/** The message under the image buttons for any picture the wizard does not take. */
export const IMAGE_REFUSED = "Image must be a valid JPEG, PNG, WebP, SVG, or GIF and not exceed 2MB";

/** The uploads among the S3 fake's requests. */
export const uploads = (requests: { method: string }[]) => requests.filter((request) => request.method === "PUT");

const badgesLogs = (receipt: TransactionReceipt) =>
  receipt.logs.filter((log) => isAddressEqual(log.address, BADGES_ADDRESS));

/** The one BadgeCreated event of the badges contract in a receipt. */
export function badgeCreatedIn(receipt: TransactionReceipt) {
  const created = parseEventLogs({
    abi: SocietyProtocolBadgesABI,
    eventName: "BadgeCreated",
    logs: badgesLogs(receipt),
  });
  if (created.length !== 1) {
    throw new Error(`Expected one BadgeCreated event in ${receipt.transactionHash}, found ${created.length}`);
  }
  return created[0].args;
}

/** The one BadgeModified event of the badges contract in a receipt. */
export function badgeModifiedIn(receipt: TransactionReceipt) {
  const modified = parseEventLogs({
    abi: SocietyProtocolBadgesABI,
    eventName: "BadgeModified",
    logs: badgesLogs(receipt),
  });
  if (modified.length !== 1) {
    throw new Error(`Expected one BadgeModified event in ${receipt.transactionHash}, found ${modified.length}`);
  }
  return modified[0].args;
}
