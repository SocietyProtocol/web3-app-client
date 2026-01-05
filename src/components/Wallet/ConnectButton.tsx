"use client";

import { Button, Stack, Typography } from "@mui/material";
import { ConnectButtonSkeleton } from "./ConnectButtonSkeleton";
import type { SxProps } from "@mui/system";
import type { ButtonPropsVariantOverrides } from "@mui/material/Button";
import { OverridableStringUnion } from "@mui/types";
import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
    profileId: { data: profileId, isLoading: profileIdLoading },
    uri: { data: uri, isLoading: uriLoading },
    profileData: { data: profileData, isLoading: profileDataLoading },
  } = useProfile();

  const isInitialLoading =
    (profileId === undefined && profileIdLoading) ||
    (uri === undefined && uriLoading) ||
    (profileData === undefined && profileDataLoading);

  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        openAccountModal,
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
              variant="outlined"
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
          <Button
            variant={variant || "wallet"}
            onClick={openAccountModal}
            sx={sx}
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
                ensImage={profileData?.avatar}
                size={24}
              />
              <Typography
                component="span"
                whiteSpace="nowrap"
                flexGrow={1}
                textAlign="left"
              >
                {profileData?.name || account.displayName}
              </Typography>
              <ExpandMoreIcon
                fontSize="small"
                sx={{
                  ml: { xs: 0, sm: 0.5 },
                  fontSize: { xs: "0.875rem", sm: "1.25rem" },
                }}
              />
            </Stack>
          </Button>
        );
      }}
    </RainbowConnectButton.Custom>
  );
};
