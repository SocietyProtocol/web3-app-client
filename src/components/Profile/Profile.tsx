"use client";

import { AccountSetupWizard } from "@/components/AccountSetup/AccountSetupWizard";
import { useEffect, useRef } from "react";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";
import { useWagmiReady } from "@/atoms/wagmiReady";
import { AccountDetails } from "@/components/AccountSetup/AccountDetails";
import { AccountSkeleton } from "@/components/AccountSetup/AccountSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import { ErrorDisplay } from "@/components/ErrorBoundary/ErrorDisplay";
import { Button } from "@mui/material";
import { parseAsBoolean, useQueryState } from "nuqs";
import { ContentGuard } from "../Bubbles/ContentGuard";
import { useUserQuery } from "@/data/users/useUserQuery";
import { profileView } from "./profileView";
import { identityLeft } from "@/lib/outpost-routing";

export const Profile = () => {
  const [accountSetupOpen, setAccountSetupOpen] = useQueryState(
    "setupOpen",
    parseAsBoolean.withDefault(false),
  );

  const wagmiReady = useWagmiReady();
  const { address } = useOutpostAccount();
  const user = useUserQuery(address);
  const shownAddress = useRef(address);

  // Close the setup when the identity it was opened for goes away
  // (disconnect, switching accounts). address is undefined while the wallet
  // is being read, so connecting and the identity settling are not changes:
  // the URL's setupOpen, or a click made meanwhile, is kept.
  useEffect(() => {
    const previous = shownAddress.current;
    shownAddress.current = address;
    if (identityLeft(previous, address)) setAccountSetupOpen(false);
  }, [address, setAccountSetupOpen]);

  const view = profileView({
    wagmiReady,
    isLoading: user.isLoading,
    isError: user.isError,
    hasData: user.data !== undefined,
  });

  if (view === "loading") {
    return <AccountSkeleton />;
  }

  if (view === "error") {
    return (
      <ErrorDisplay
        error={user.error}
        action={
          <Button onClick={() => user.refetch()} variant="contained">
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <ErrorBoundary>
      <ContentGuard
        requireNetwork={!user.data?.profile}
        keepMountedOnWrongNetwork
        requireAccount={!accountSetupOpen}
        sx={{
          paddingX: { xs: 3, md: 6 },
          paddingY: { xs: 5, md: 7 },
          overflow: "hidden",
        }}
      >
        {user.data?.profile ? (
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
