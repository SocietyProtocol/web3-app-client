"use client";

import { Button, Stack, Typography } from "@mui/material";
import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Avatar } from "../Avatar/Avatar";

interface ConnectButtonProps {
  avatarSrc?: string;
}

export const ConnectButton = ({ avatarSrc }: ConnectButtonProps) => {
  return (
    <RainbowConnectButton.Custom>
      {({ account, openAccountModal, openConnectModal, mounted: ready }) => {
        if (!ready || !account) {
          return (
            <Button
              disabled={!ready}
              variant="outlined"
              onClick={openConnectModal}
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
          <Button variant="wallet" onClick={openAccountModal}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={{ xs: 0.5, sm: 0.75, md: 1 }}
            >
              <Avatar
                address={account.address}
                ensImage={avatarSrc || null}
                size={20}
              />
              <Typography component="span" whiteSpace="nowrap">
                {account.displayName}
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
