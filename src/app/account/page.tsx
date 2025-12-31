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
import { WrtongNetworkBubble } from "@/components/Bubbles/WrongNetworkBubble";

export default function AccountPage() {
  const [accountSetupOpen, setAccountSetupOpen] = useState(false);
  const wagmiReady = useWagmiReady();
  const { address } = useAccount();
  const profile = useProfile(address);

  if (
    !wagmiReady ||
    (profile.profileId.data === undefined && profile.profileId.isLoading) ||
    (profile.uri.data === undefined && profile.uri.isLoading) ||
    (profile.profileData.data === undefined && profile.profileData.isLoading)
  ) {
    return <AccountSkeleton />;
  }

  return (
    <>
      <Stack alignItems="center" justifyContent="center">
        <ConnectWalletBubble />
        <WrtongNetworkBubble />
        <AccountSetupBubble
          show={!accountSetupOpen}
          onActionClick={() => setAccountSetupOpen(true)}
        />
      </Stack>
      {accountSetupOpen && <AccountSetupWizard />}
      {profile.profileData.data && <AccountDetails />}
    </>
  );
}
