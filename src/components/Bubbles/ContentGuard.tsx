"use client";

import { useWagmiReady } from "@/atoms/wagmiReady";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { useAccount } from "wagmi";
import { useProfile } from "../AccountSetup/useProfile";
import { Box, Button, Stack, SxProps } from "@mui/material";
import { ConnectWalletBubble } from "./ConnectWalletBubble";
import { WrongNetworkBubble } from "./WrongNetworkBubble";
import { AccountSetupBubble } from "./AccountSetupBubble";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export interface ContentGuardProps {
  requireNetwork?: boolean;
  requireAccount?: boolean;
  loading?: boolean;
  children?: ReactNode;
  fallback?: ReactNode;
  connectWalletMessage?: string;
  switchNetworkMessage?: string;
  showBackButton?: boolean;
  sx?: SxProps;
}

export const ContentGuard = ({
  requireNetwork,
  requireAccount,
  loading = false,
  children,
  fallback,
  connectWalletMessage,
  switchNetworkMessage,
  showBackButton = false,
  sx,
}: ContentGuardProps) => {
  const router = useRouter();

  const wagmiReady = useWagmiReady();
  const { address, isConnected } = useAccount();
  const { isWrongNetwork } = useCheckWrongNetwork();
  const profile = useProfile(requireAccount ? address : undefined);

  if (loading || !wagmiReady || (requireAccount && profile.isInitialLoading)) {
    return fallback;
  }

  if (
    isConnected &&
    (!requireNetwork || !isWrongNetwork) &&
    (!requireAccount || profile.profileData.data)
  ) {
    return children;
  }

  return (
    <Box>
      {showBackButton && (
        <Box
          sx={{
            alignSelf: "flex-start",
          }}
        >
          <Button
            variant="text"
            onClick={() => router.back()}
            startIcon={<ArrowBackIcon sx={{ fontSize: "14px !important" }} />}
            sx={{
              color: "primary.main",
              fontSize: { xs: "0.875rem", sm: "1rem" },
              textTransform: "none",
              fontWeight: 600,
              minWidth: { xs: "auto", sm: "64px" },
              px: { xs: 1, sm: 2 },
            }}
            aria-label="Go back"
          >
            <Box
              component="span"
              sx={{ display: { xs: "none", sm: "inline" } }}
            >
              Back
            </Box>
          </Button>
        </Box>
      )}
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={[
          {
            maxWidth: 600,
            marginX: "auto",
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {!isConnected ? (
          <ConnectWalletBubble message={connectWalletMessage} />
        ) : requireNetwork && isWrongNetwork ? (
          <WrongNetworkBubble message={switchNetworkMessage} />
        ) : (
          requireAccount &&
          !profile.profileData.data && (
            <AccountSetupBubble
              onActionClick={() => router.push("/profile?setupOpen=true")}
            />
          )
        )}
      </Stack>
    </Box>
  );
};
