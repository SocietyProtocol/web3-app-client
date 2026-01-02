"use client";

import { AccountSetupWizard } from "@/components/AccountSetup/AccountSetupWizard";
import { AccountSetupBubble } from "@/components/Bubbles/AccountSetupBubble";
import { ConnectWalletBubble } from "@/components/Bubbles/ConnectWalletBubble";
import { useState } from "react";
import { useAccount } from "wagmi";
import { useProfile } from "@/components/AccountSetup/useProfile";
import { Stack } from "@mui/material";
import { useWagmiReady } from "@/atoms/wagmiReady";
import { AccountDetails } from "@/components/AccountSetup/AccountDetails";
import { AccountSkeleton } from "@/components/AccountSetup/AccountSkeleton";
import { WrongNetworkBubble } from "@/components/Bubbles/WrongNetworkBubble";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";

export default function AccountPage() {
  const [accountSetupOpen, setAccountSetupOpen] = useState(false);
  const wagmiReady = useWagmiReady();
  const { address } = useAccount();
  const profile = useProfile(address);

  const inInitialLoading =
    (profile.profileId.data === undefined && profile.profileId.isLoading) ||
    (profile.uri.data === undefined && profile.uri.isLoading) ||
    (profile.profileData.data === undefined && profile.profileData.isLoading);

  if (!wagmiReady || inInitialLoading) {
    return <AccountSkeleton />;
  }

  return (
    <ErrorBoundary>
      <Stack alignItems="center" justifyContent="center">
        <ConnectWalletBubble />
        <WrongNetworkBubble />
        <AccountSetupBubble
          show={!accountSetupOpen && !profile.profileData.data}
          onActionClick={() => setAccountSetupOpen(true)}
        />
      </Stack>
      {accountSetupOpen && (
        <AccountSetupWizard onComplete={() => setAccountSetupOpen(false)} />
      )}
      {profile.profileData.data && <AccountDetails />}
    </ErrorBoundary>
  );
}
