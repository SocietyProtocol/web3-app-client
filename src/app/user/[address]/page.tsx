"use client";

import { useWagmiReady } from "@/atoms/wagmiReady";
import { AccountDetails } from "@/components/AccountSetup/AccountDetails";
import { AccountSkeleton } from "@/components/AccountSetup/AccountSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { isAddress } from "viem";
import { use, useMemo, useEffect } from "react";
import { notFound, redirect } from "next/navigation";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";
import { isEqualCaseInsensitive, truncateAddress } from "@/utils/string";
import { useUserQuery } from "@/data/users/useUserQuery";
import legacyAccounts from "@/consts/legacy-account-map.json";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address: connectedAddress } = useOutpostAccount();
  const { address } = use(params);

  const wagmiReady = useWagmiReady();

  const concreteAddress = useMemo(
    () => (isAddress(address) ? address : undefined),
    [address],
  );

  const user = useUserQuery(concreteAddress);

  useEffect(() => {
    document.title = `User ${user.data?.name ? `@${user.data.name}` : concreteAddress ? truncateAddress(concreteAddress) : ""} | Society Protocol`;
  }, [concreteAddress, user.data?.name]);

  if (concreteAddress === undefined) {
    return notFound();
  }

  const smartAccount =
    legacyAccounts[concreteAddress.toLowerCase() as keyof typeof legacyAccounts];
  if (smartAccount) {
    return redirect(`/user/${smartAccount}`);
  }

  if (connectedAddress && isEqualCaseInsensitive(connectedAddress, address)) {
    return redirect("/profile");
  }

  if (!wagmiReady || user.isLoading) {
    return <AccountSkeleton />;
  }

  return (
    <ErrorBoundary>
      <AccountDetails address={concreteAddress} readonly />
    </ErrorBoundary>
  );
}
