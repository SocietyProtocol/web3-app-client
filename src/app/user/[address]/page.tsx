"use client";

import { useProfile } from "@/components/AccountSetup/useProfile";
import { useWagmiReady } from "@/atoms/wagmiReady";
import { AccountDetails } from "@/components/AccountSetup/AccountDetails";
import { AccountSkeleton } from "@/components/AccountSetup/AccountSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { checksumAddress, isAddress } from "viem";
import { use } from "react";
import { notFound, redirect } from "next/navigation";
import { useAccount } from "wagmi";
import { isEqualCaseInsensitive } from "@/utils/string";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address: connectedAddress } = useAccount();
  const { address } = use(params);
  const wagmiReady = useWagmiReady();

  const _checksumAddress = isAddress(address)
    ? checksumAddress(address)
    : undefined;

  const profile = useProfile(_checksumAddress);

  if (!_checksumAddress) {
    return notFound();
  }

  if (connectedAddress && isEqualCaseInsensitive(connectedAddress, address)) {
    return redirect("/profile");
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
      <AccountDetails address={_checksumAddress} readonly />
    </ErrorBoundary>
  );
}
