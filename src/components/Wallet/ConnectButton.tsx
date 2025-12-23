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
      {({ account, openAccountModal, openConnectModal, mounted }) => {
        const ready = mounted;

        if (!ready || !account) {
          return (
            <Button
              disabled={!ready}
              variant="outlined"
              onClick={openConnectModal}
              sx={{
                fontSize: { xs: "0.7rem", sm: "0.875rem", md: "1rem" },
                padding: { xs: "4px 8px", sm: "8px 16px" },
                minWidth: { xs: "auto", sm: "100px" },
                height: { xs: "32px", sm: "40px", md: "48px" },
              }}
            >
              <span style={{ display: "inline-block" }}>
                <Typography style={{ display: "inline", whiteSpace: "nowrap" }}>
                  Connect
                </Typography>
                <Typography
                  sx={{
                    display: { xs: "none", sm: "inline" },
                  }}
                >
                  {" "}
                  Wallet
                </Typography>
              </span>
            </Button>
          );
        }

        return (
          <Button
            variant="wallet"
            onClick={openAccountModal}
            sx={{
              fontSize: { xs: "0.7rem", sm: "0.875rem", md: "1rem" },
              padding: { xs: "2px 6px", sm: "6px 12px", md: "8px 16px" },
              minWidth: { xs: "auto", sm: "100px" },
              height: { xs: "32px", sm: "40px", md: "48px" },
              "& .wallet-text": {
                display: { xs: "none", sm: "inline" },
              },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={{ xs: 0.25, sm: 0.75, md: 1 }}
            >
              <Avatar
                address={account.address}
                ensImage={avatarSrc || null}
                size={20}
              />
              <Typography
                whiteSpace="nowrap"
                sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem", md: "1rem" } }}
              >
                {account ? `${account.displayName}` : "Connect"}
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
