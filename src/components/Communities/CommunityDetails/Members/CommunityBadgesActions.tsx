"use client";

import { Box } from "@mui/material";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Address } from "viem";
import { BadgeActions } from "@/components/Badges/BadgeActions";
import { BadgeAutocomplete } from "@/components/Badges/BadgeAutocomplete/BadgeAutocomplete";
import { useBadge } from "@/data/badges/useBadge";
import { getBadgePermissions } from "@/data/badges/utils";
import { BadgeOption } from "@/components/Badges/BadgeAutocomplete/types";
import { AutocompleteProps } from "@mui/material";
import { useCommunityDetailsContext } from "../CommunityDetails.context";
import { uniqueBy } from "@/utils/collection";

export function CommunityBadgesActions() {
  const { address } = useAccount();
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
    eligibleBadges[0]?.id,
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
      data?.badge && address
        ? getBadgePermissions(data.badge, address as Address)
        : { canMint: false, canBurn: false, canTransfer: false },
    [address, data],
  );

  const eligibleBadgeIds = useMemo(
    () => new Set(eligibleBadges.map((badge) => badge.id)),
    [eligibleBadges],
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
            value={validSelectedBadgeId}
            onChange={handleBadgeChange}
            queryOptions={{ isCommunity: true }}
            optionFilter={(badge: BadgeOption) =>
              eligibleBadgeIds.has(badge.id)
            }
          />
        }
      />
    </Box>
  );
}
