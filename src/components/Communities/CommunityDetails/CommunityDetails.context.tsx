"use client";

import { ReactNode, createContext, useContext, useMemo } from "react";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";
import { Address } from "viem";
import {
  findIdentity,
  identityAddresses,
} from "@/components/shared/accountIdentity";
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
  refetch: () => Promise<unknown>;
  tierName: CommunityTier;
  tierColor: string;
  badgeCount: number;
  memberCount: number;
  isManager: boolean;
  /**
   * The member address that holds the manager badge: the Society address,
   * or the owner wallet for communities created before the migration.
   */
  managerHolder: Address | undefined;
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
  const { address, ownerAddress } = useOutpostAccount();

  const {
    community,
    isLoading,
    isError,
    error,
    refetch,
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
    const managerHolder = findIdentity(
      managerAddress,
      identityAddresses(address, ownerAddress),
    );
    const isManager = !!managerHolder;

    return {
      id,
      community,
      isLoading,
      isError,
      error,
      refetch,
      tierName,
      tierColor,
      badgeCount,
      memberCount,
      isManager,
      managerHolder,
      tab,
      setTab,
    };
  }, [
    address,
    ownerAddress,
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
    refetch,
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
