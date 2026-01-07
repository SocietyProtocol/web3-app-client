"use client";

import { useProfile } from "@/components/AccountSetup/useProfile";
import { useWagmiReady } from "@/atoms/wagmiReady";
import { AccountDetails } from "@/components/AccountSetup/AccountDetails";
import { AccountSkeleton } from "@/components/AccountSetup/AccountSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { Hex, isAddress } from "viem";
import { use } from "react";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const wagmiReady = useWagmiReady();

  const isValidAddress = isAddress(address);

  const profile = useProfile(isValidAddress ? (address as Hex) : undefined);

  if (!isValidAddress) {
    return (
      <ErrorBoundary>
        <div>Invalid address</div>
      </ErrorBoundary>
    );
  }

  const isInitialLoading =
    (profile.profileId.data === undefined && profile.profileId.isLoading) ||
    (profile.uri.data === undefined && profile.uri.isLoading) ||
    (profile.profileData.data === undefined && profile.profileData.isLoading);

  if (!wagmiReady || isInitialLoading) {
    return <AccountSkeleton />;
  }

  return (
    <ErrorBoundary>
      <AccountDetails address={address as Hex} readonly />
    </ErrorBoundary>
  );
}
