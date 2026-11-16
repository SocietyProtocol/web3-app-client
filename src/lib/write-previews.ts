import { Hex, isAddress, zeroAddress } from "viem";
import { PREVIEW_METADATA_URI } from "@/lib/payment-label";

/**
 * Arguments for the preview calls that price a write before its metadata is
 * uploaded. They follow what the user has typed so far; only the URIs that
 * exist after the upload are stood in for. Values the form would reject are
 * left out rather than guessed.
 */

export type BadgeDraft = {
  name?: string;
  isOfficial?: boolean;
  /** An image or metadata will be uploaded, so the call carries a URI. */
  hasMetadata?: boolean;
  minters?: string[];
  transferers?: string[];
  burners?: string[];
  editors?: string[];
};

export type CommunityDraft = {
  name?: string;
  description?: string;
};

const badgeIds = (ids: string[] | undefined): bigint[] =>
  (ids ?? []).flatMap((id) => {
    if (!/^\d+$/.test(id.trim())) return [];
    return [BigInt(id.trim())];
  });

const addresses = (values: string[] | undefined): Hex[] =>
  (values ?? []).flatMap((value) => {
    const trimmed = value.trim();
    return isAddress(trimmed, { strict: false })
      ? [trimmed.toLowerCase() as Hex]
      : [];
  });

const metadataUri = (draft: BadgeDraft) =>
  draft.hasMetadata ? PREVIEW_METADATA_URI : "";

/** createBadge on the badges contract. */
export function badgeCreatePreviewArgs(draft: BadgeDraft) {
  return [
    draft.name || "Badge",
    !!draft.isOfficial,
    false,
    zeroAddress,
    metadataUri(draft),
    badgeIds(draft.minters),
    badgeIds(draft.transferers),
    badgeIds(draft.burners),
    addresses(draft.editors),
  ] as const;
}

/** createCommunityBadge on the community registry. */
export function communityBadgePreviewArgs(
  communityId: bigint,
  draft: BadgeDraft,
) {
  return [
    communityId,
    draft.name || "Badge",
    metadataUri(draft),
    badgeIds(draft.minters),
    badgeIds(draft.transferers),
    badgeIds(draft.burners),
  ] as const;
}

/** createCommunity on the community registry; its three badge URIs are uploaded on submit. */
export function communityCreatePreviewArgs(draft: CommunityDraft) {
  return [
    draft.name || "Community",
    draft.description || "Community",
    PREVIEW_METADATA_URI,
    PREVIEW_METADATA_URI,
    PREVIEW_METADATA_URI,
  ] as const;
}

/** modifyBadge on the badges contract. */
export function badgeEditPreviewArgs(badgeId: bigint, draft: BadgeDraft) {
  return [
    badgeId,
    draft.name || "Badge",
    !!draft.isOfficial,
    metadataUri(draft),
  ] as const;
}
