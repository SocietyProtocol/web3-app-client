"use client";

import { useWagmiReady } from "@/atoms/wagmiReady";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { useAccount } from "wagmi";
import { Box, Button, Stack, SxProps } from "@mui/material";
import { ConnectWalletBubble } from "./ConnectWalletBubble";
import { WrongNetworkBubble } from "./WrongNetworkBubble";
import { AccountSetupBubble } from "./AccountSetupBubble";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useUserQuery } from "@/data/users/useUserQuery";
import { mergeSx } from "@/utils/sx";

export type ContentGuardProps = {
  requireNetwork?: boolean;
  requireAccount?: boolean;
  loading?: boolean;
  children?: ReactNode;
  fallback?: ReactNode;
  sx?: SxProps;
} & (
  | {
      hideBubbles?: false;
      connectWalletMessage?: string;
      switchNetworkMessage?: string;
      showBackButton?: boolean;
    }
  | {
      hideBubbles: true;
    }
);

export const ContentGuard = (props: ContentGuardProps) => {
  const {
    requireNetwork,
    requireAccount,
    loading = false,
    children,
    fallback,
    sx,
  } = props;
  const router = useRouter();

  const wagmiReady = useWagmiReady();
  const { address, isConnected } = useAccount();
  const { isWrongNetwork } = useCheckWrongNetwork();
  const profile = useUserQuery(requireAccount ? address : undefined);

  if (loading || !wagmiReady || (requireAccount && profile.isLoading)) {
    return fallback;
  }

  if (
    isConnected &&
    (!requireNetwork || !isWrongNetwork) &&
    (!requireAccount || profile.data)
  ) {
    return children;
  }

  if (props.hideBubbles) {
    return null;
  }

  const { showBackButton, connectWalletMessage, switchNetworkMessage } = props;

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
        sx={mergeSx(
          {
            maxWidth: 600,
            marginX: "auto",
          },
          sx,
        )}
      >
        {!isConnected ? (
          <ConnectWalletBubble message={connectWalletMessage} />
        ) : requireNetwork && isWrongNetwork ? (
          <WrongNetworkBubble message={switchNetworkMessage} />
        ) : (
          requireAccount &&
          !profile.data && (
            <AccountSetupBubble
              onActionClick={() => router.push("/profile?setupOpen=true")}
            />
          )
        )}
      </Stack>
    </Box>
  );
};
