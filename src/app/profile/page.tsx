"use client";

import { AccountSetupWizard } from "@/components/AccountSetup/AccountSetupWizard";
import { AccountSetupBubble } from "@/components/Bubbles/AccountSetupBubble";
import { ConnectWalletBubble } from "@/components/Bubbles/ConnectWalletBubble";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useProfile } from "@/components/AccountSetup/useProfile";
import { Stack } from "@mui/material";
import { useWagmiReady } from "@/atoms/wagmiReady";
import { AccountDetails } from "@/components/AccountSetup/AccountDetails";
import { AccountSkeleton } from "@/components/AccountSetup/AccountSkeleton";
import { WrongNetworkBubble } from "@/components/Bubbles/WrongNetworkBubble";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { parseAsBoolean, useQueryState } from "nuqs";

export default function ProfilePage() {
  const [accountSetupOpen, setAccountSetupOpen] = useQueryState(
    "setupOpen",
    parseAsBoolean.withDefault(false),
  );

  const wagmiReady = useWagmiReady();
  const { address, isConnected } = useAccount();
  const { isWrongNetwork } = useCheckWrongNetwork();
  const profile = useProfile(address);

  const isInitialLoading =
    (profile.profileId.data === undefined && profile.profileId.isLoading) ||
    (profile.uri.data === undefined && profile.uri.isLoading) ||
    (profile.profileData.data === undefined && profile.profileData.isLoading);

  // reset accountSetupOpen when user connects/disconnects or address changes
  useEffect(() => {
    // Close the setup whenever connection or address changes
    // (covers connect, disconnect, and switching accounts)
    setAccountSetupOpen(false);
  }, [isConnected, address, setAccountSetupOpen]);

  if (!wagmiReady || isInitialLoading) {
    return <AccountSkeleton />;
  }

  return (
    <ErrorBoundary>
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{
          maxWidth: 600,
          marginX: "auto",
        }}
      >
        {!isConnected ? (
          <ConnectWalletBubble />
        ) : isWrongNetwork ? (
          <WrongNetworkBubble />
        ) : (
          !profile.profileData.data &&
          !accountSetupOpen && (
            <AccountSetupBubble
              onActionClick={() => setAccountSetupOpen(true)}
            />
          )
        )}
      </Stack>
      {!isConnected || isWrongNetwork ? null : profile.profileData.data ? (
        <AccountDetails />
      ) : (
        accountSetupOpen && (
          <AccountSetupWizard onComplete={() => setAccountSetupOpen(false)} />
        )
      )}
    </ErrorBoundary>
  );
}
