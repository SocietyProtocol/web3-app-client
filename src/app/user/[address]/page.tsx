"use client";

import { useProfile } from "@/components/AccountSetup/useProfile";
import { useWagmiReady } from "@/atoms/wagmiReady";
import { AccountDetails } from "@/components/AccountSetup/AccountDetails";
import { AccountSkeleton } from "@/components/AccountSetup/AccountSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { checksumAddress, isAddress } from "viem";
import { use } from "react";
import { redirect } from "next/navigation";
import { useAccount } from "wagmi";
import { ErrorDisplay } from "@/components/ErrorBoundary/ErrorDisplay";
import { Button } from "@mui/material";
import { ValidationError } from "@/errors/ValidationError";

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
    return (
      <ErrorDisplay
        error={new ValidationError("Invalid address provided")}
        action={
          <Button
            variant="contained"
            onClick={() => {
              redirect("/");
            }}
          >
            Go to Home
          </Button>
        }
      />
    );
  }

  if (connectedAddress?.toLowerCase() === address.toLowerCase()) {
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
