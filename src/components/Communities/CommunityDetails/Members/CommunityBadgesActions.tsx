"use client";

import { Box } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { useIdentityAddresses } from "@/components/shared/useLegacyAccounts";
import { BadgeActions } from "@/components/Badges/BadgeActions";
import { BadgeAutocomplete } from "@/components/Badges/BadgeAutocomplete/BadgeAutocomplete";
import { useBadge } from "@/data/badges/useBadge";
import { getBadgePermissions } from "@/data/badges/utils";
import { BadgeOption } from "@/components/Badges/BadgeAutocomplete/types";
import { AutocompleteProps } from "@mui/material";
import { useCommunityDetailsContext } from "../CommunityDetails.context";
import { uniqueBy } from "@/utils/collection";

export function CommunityBadgesActions() {
  // Society address and owner wallet; legacy rights stay on the wallet.
  const addresses = useIdentityAddresses();
  const { community } = useCommunityDetailsContext();

  const eligibleBadges = useMemo(() => {
    return uniqueBy(
      community?.badges.filter(
        (badge) => badge.id !== community?.managerBadge?.id,
      ) ?? [],
      (badge) => badge.id,
    );
  }, [community]);

  const [selectedBadgeId, setSelectedBadgeId] = useState<string | undefined>(
    eligibleBadges.find((badge) => badge.id === community?.memberBadge?.id)
      ?.id ?? eligibleBadges[0]?.id,
  );

  const validSelectedBadgeId = useMemo(() => {
    if (!eligibleBadges.length) return undefined;

    const hasSelected =
      !!selectedBadgeId &&
      eligibleBadges.some((badge) => badge.id === selectedBadgeId);

    return hasSelected ? selectedBadgeId : eligibleBadges[0]?.id;
  }, [eligibleBadges, selectedBadgeId]);

  const { data, isLoading } = useBadge(validSelectedBadgeId);

  const { canMint, canBurn, canTransfer } = useMemo(
    () =>
      data?.badge && addresses.length
        ? getBadgePermissions(data.badge, addresses)
        : { canMint: false, canBurn: false, canTransfer: false },
    [addresses, data],
  );

  const eligibleBadgeIds = useMemo(
    () => new Set(eligibleBadges.map((badge) => badge.id)),
    [eligibleBadges],
  );

  const optionFilter = useCallback(
    (badge: BadgeOption) => eligibleBadgeIds.has(badge.id),
    [eligibleBadgeIds],
  );

  if (!eligibleBadges.length || !validSelectedBadgeId) {
    return null;
  }

  const handleBadgeChange: AutocompleteProps<
    BadgeOption,
    false,
    false,
    true
  >["onChange"] = (_, value) => {
    if (!value) {
      return;
    }

    const badgeId = typeof value === "string" ? value : value.id;

    if (eligibleBadgeIds.has(badgeId)) {
      setSelectedBadgeId(badgeId);
    }
  };

  return (
    <Box>
      <BadgeActions
        id={validSelectedBadgeId}
        canMint={canMint}
        canBurn={canBurn}
        canTransfer={canTransfer}
        loading={isLoading}
        badgeSelector={
          <BadgeAutocomplete
            label="Badge"
            multiple={false}
            disableClearable
            value={validSelectedBadgeId}
            onChange={handleBadgeChange}
            queryOptions={{ isCommunity: true }}
            optionFilter={optionFilter}
          />
        }
      />
    </Box>
  );
}
