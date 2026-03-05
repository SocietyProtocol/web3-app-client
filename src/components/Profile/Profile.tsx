"use client";

import { AccountSetupWizard } from "@/components/AccountSetup/AccountSetupWizard";
import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useWagmiReady } from "@/atoms/wagmiReady";
import { AccountDetails } from "@/components/AccountSetup/AccountDetails";
import { AccountSkeleton } from "@/components/AccountSetup/AccountSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { parseAsBoolean, useQueryState } from "nuqs";
import { ContentGuard } from "../Bubbles/ContentGuard";
import { useUserQuery } from "@/data/users/useUserQuery";

export const Profile = () => {
  const [accountSetupOpen, setAccountSetupOpen] = useQueryState(
    "setupOpen",
    parseAsBoolean.withDefault(false),
  );

  const wagmiReady = useWagmiReady();
  const { address, isConnected } = useAccount();
  const user = useUserQuery(address);
  const isInitialMount = useRef(true);

  // reset accountSetupOpen when user connects/disconnects or address changes
  useEffect(() => {
    // Skip the initial mount to preserve setupOpen from URL
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Close the setup whenever connection or address changes
    // (covers connect, disconnect, and switching accounts)
    setAccountSetupOpen(false);
  }, [isConnected, address, setAccountSetupOpen]);

  if (!wagmiReady || user.isLoading) {
    return <AccountSkeleton />;
  }

  return (
    <ErrorBoundary>
      <ContentGuard
        requireNetwork={!user.data}
        requireAccount={!accountSetupOpen}
        sx={{
          paddingX: { xs: 3, md: 6 },
          paddingY: { xs: 5, md: 7 },
          overflow: "hidden",
        }}
      >
        {user.data ? (
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
