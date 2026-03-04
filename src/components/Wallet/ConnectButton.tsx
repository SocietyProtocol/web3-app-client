"use client";

import { Button, Stack, Tooltip, Typography } from "@mui/material";
import { ConnectButtonSkeleton } from "./ConnectButtonSkeleton";
import type { SxProps } from "@mui/system";
import type { ButtonPropsVariantOverrides } from "@mui/material/Button";
import { OverridableStringUnion } from "@mui/types";
import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ErrorIcon from "@mui/icons-material/Error";
import { Avatar } from "../Avatar/Avatar";
import { useProfile } from "../AccountSetup/useProfile";

interface ConnectButtonProps {
  sx?: SxProps;
  fullWidth?: boolean;
  variant?: OverridableStringUnion<
    "text" | "outlined" | "contained",
    ButtonPropsVariantOverrides
  >;
}

export const ConnectButton = ({
  sx,
  fullWidth,
  variant,
}: ConnectButtonProps) => {
  const {
    profileId: { isLoading: profileIdLoading },
    uri: { isLoading: uriLoading },
    profileData: { data: profileData, isLoading: profileDataLoading },
    isInitialLoading,
  } = useProfile();

  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        mounted: wagmiReady,
        openConnectModal,
      }) => {
        if (!wagmiReady || isInitialLoading) {
          return <ConnectButtonSkeleton fullWidth={fullWidth} sx={sx} />;
        }

        if (!account) {
          return (
            <Button
              disabled={!wagmiReady}
              variant={variant || "outlined"}
              onClick={openConnectModal}
              sx={sx}
              fullWidth={fullWidth}
            >
              <Typography component="span" whiteSpace="nowrap">
                Connect
                <Typography
                  component="span"
                  sx={{
                    display: { xs: "none", sm: "inline" },
                  }}
                >
                  {" "}
                  Wallet
                </Typography>
              </Typography>
            </Button>
          );
        }

        return (
          <Tooltip
            title={chain?.unsupported ? "Wrong network — click to switch" : ""}
            arrow
          >
            <Button
              variant={variant || "wallet"}
              onClick={chain?.unsupported ? openChainModal : openAccountModal}
              sx={[
                ...(Array.isArray(sx) ? sx : [sx]),
                chain?.unsupported && {
                  border: (theme) => `1px solid ${theme.palette.error.dark}`,
                },
              ]}
              fullWidth={fullWidth}
            >
              <Stack
                direction="row"
                alignItems="center"
                flexGrow={1}
                spacing={{ xs: 0.5, sm: 0.75, md: 1 }}
              >
                <Avatar
                  address={account.address}
                  ensImage={profileData?.imageUrl}
                  size={24}
                  loading={profileIdLoading || uriLoading || profileDataLoading}
                />
                <Typography
                  component="span"
                  whiteSpace="nowrap"
                  flexGrow={1}
                  textAlign="left"
                >
                  {profileData?.name || account.displayName}
                </Typography>
                {chain?.unsupported ? (
                  <ErrorIcon
                    sx={{
                      ml: { xs: 0, sm: 0.5 },
                      fontSize: { xs: "0.875rem", sm: "1.25rem" },
                      color: "error.dark",
                    }}
                  />
                ) : (
                  <ExpandMoreIcon
                    fontSize="small"
                    sx={{
                      ml: { xs: 0, sm: 0.5 },
                      fontSize: { xs: "0.875rem", sm: "1.25rem" },
                    }}
                  />
                )}
              </Stack>
            </Button>
          </Tooltip>
        );
      }}
    </RainbowConnectButton.Custom>
  );
};
