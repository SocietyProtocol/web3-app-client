import { useMemo } from "react";
import { useTheme } from "@mui/material";
import { useCommunity } from "@/data/communities/useCommunity";
import { getTierColor, resolveTierName } from "@/components/Communities/utils";
import { useNow } from "@/hooks/useNow";

export function useCommunityDetail(id: string) {
  const theme = useTheme();
  const { data, isLoading, isError, error } = useCommunity(id);

  const now = useNow({
    updateAt: data?.community?.tierExpiresAt
      ? Number(data.community.tierExpiresAt)
      : undefined,
  });

  const tierName = useMemo(
    () =>
      resolveTierName(
        data?.community?.tierName,
        data?.community?.tierExpiresAt,
        now,
      ),
    [data?.community?.tierName, data?.community?.tierExpiresAt, now],
  );

  const tierColor = getTierColor(theme, tierName);

  const badgeCount = data?.community?.badges?.length ?? 0;
  const memberCount = data?.community?.memberCount
    ? Number(data.community.memberCount)
    : 0;

  return {
    community: data?.community,
    memberJoinedActivities: data?.memberJoinedActivities ?? [],
    isLoading,
    isError,
    error,
    tierName,
    tierColor,
    badgeCount,
    memberCount,
  };
}
