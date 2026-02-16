"use client";

import { AccountSetupWizard } from "@/components/AccountSetup/AccountSetupWizard";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useProfile } from "@/components/AccountSetup/useProfile";
import { useWagmiReady } from "@/atoms/wagmiReady";
import { AccountDetails } from "@/components/AccountSetup/AccountDetails";
import { AccountSkeleton } from "@/components/AccountSetup/AccountSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { parseAsBoolean, useQueryState } from "nuqs";
import { ContentGuard } from "../Bubbles/ContentGuard";

export const Profile = () => {
  const [accountSetupOpen, setAccountSetupOpen] = useQueryState(
    "setupOpen",
    parseAsBoolean.withDefault(false),
  );

  const wagmiReady = useWagmiReady();
  const { address, isConnected } = useAccount();
  const profile = useProfile(address);

  // reset accountSetupOpen when user connects/disconnects or address changes
  useEffect(() => {
    // Close the setup whenever connection or address changes
    // (covers connect, disconnect, and switching accounts)
    setAccountSetupOpen(false);
  }, [isConnected, address, setAccountSetupOpen]);

  if (!wagmiReady || profile.isInitialLoading) {
    return <AccountSkeleton />;
  }

  return (
    <ErrorBoundary>
      <ContentGuard
        requireNetwork={!profile.profileData.data}
        requireAccount={!accountSetupOpen}
      >
        {profile.profileData.data ? (
          <AccountDetails />
        ) : (
          accountSetupOpen && (
            <AccountSetupWizard onComplete={() => setAccountSetupOpen(false)} />
          )
        )}
      </ContentGuard>
    </ErrorBoundary>
  );
};
