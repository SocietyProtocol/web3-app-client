"use client";

import { ReactNode, createContext, useContext, useMemo } from "react";
import { useAccount } from "wagmi";
import { isEqualCaseInsensitive } from "@/utils/string";
import { useCommunityDetail } from "./useCommunityDetail";
import { CommunityQuery } from "../../../../.graphclient";
import { CommunityDetailsTab } from "./CommunityDetail.types";
import { useQueryState } from "nuqs";
import { parseAsStringEnum } from "nuqs";
import { CommunityTier } from "@/data/communities/types";

interface CommunityDetailsContextValue {
  id: string;
  community: CommunityQuery["community"] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  tierName: CommunityTier;
  tierColor: string;
  badgeCount: number;
  memberCount: number;
  isManager: boolean;
  tab: CommunityDetailsTab;
  setTab: (tab: CommunityDetailsTab) => void;
}

interface CommunityDetailsProviderProps {
  id: string;
  children: ReactNode;
}

const CommunityDetailsContext = createContext<
  CommunityDetailsContextValue | undefined
>(undefined);

export function CommunityDetailsProvider({
  id,
  children,
}: CommunityDetailsProviderProps) {
  const { address } = useAccount();

  const {
    community,
    isLoading,
    isError,
    error,
    tierName,
    tierColor,
    badgeCount,
    memberCount,
  } = useCommunityDetail(id);

  const managerAddress = community?.managerAddress;

  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringEnum([
      CommunityDetailsTab.Overview,
      CommunityDetailsTab.Members,
      CommunityDetailsTab.Badges,
      CommunityDetailsTab.Governance,
      CommunityDetailsTab.Settings,
    ]).withDefault(CommunityDetailsTab.Overview),
  );

  const value = useMemo<CommunityDetailsContextValue>(() => {
    const isManager =
      !!address &&
      !!managerAddress &&
      isEqualCaseInsensitive(address, managerAddress);

    return {
      id,
      community,
      isLoading,
      isError,
      error,
      tierName,
      tierColor,
      badgeCount,
      memberCount,
      isManager,
      tab,
      setTab,
    };
  }, [
    address,
    badgeCount,
    community,
    error,
    id,
    isError,
    isLoading,
    managerAddress,
    memberCount,
    setTab,
    tab,
    tierColor,
    tierName,
  ]);

  return (
    <CommunityDetailsContext.Provider value={value}>
      {children}
    </CommunityDetailsContext.Provider>
  );
}

export function useCommunityDetailsContext() {
  const context = useContext(CommunityDetailsContext);

  if (!context) {
    throw new Error(
      "useCommunityDetailsContext must be used within CommunityDetailsProvider",
    );
  }

  return context;
}
