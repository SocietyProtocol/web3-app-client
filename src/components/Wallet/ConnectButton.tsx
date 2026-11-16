"use client";

import {
  Box,
  Button,
  Divider,
  Menu,
  MenuItem,
  Stack,
  Theme,
  Tooltip,
  Typography,
} from "@mui/material";
import { MouseEvent, useState } from "react";
import { ConnectButtonSkeleton } from "./ConnectButtonSkeleton";
import { connectButtonView } from "./connectButtonView";
import { useWagmiReady } from "@/atoms/wagmiReady";
import type { SxProps } from "@mui/system";
import type { ButtonPropsVariantOverrides } from "@mui/material/Button";
import { OverridableStringUnion } from "@mui/types";
import { ConnectButton as RainbowConnectButton } from "@rainbow-me/rainbowkit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ErrorIcon from "@mui/icons-material/Error";
import { Avatar } from "../Avatar/Avatar";
import { useUserQuery } from "@/data/users/useUserQuery";
import { mergeSx } from "@/utils/sx";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";
import { truncateAddress } from "@/utils/string";
import { CopyButton } from "../CopyButton/CopyButton";
import { Address } from "viem";

const AccountMenuRow = ({
  label,
  address,
  testId,
}: {
  label: string;
  address: Address;
  testId: string;
}) => (
  <Box sx={{ px: 2, py: 1 }}>
    <Typography variant="caption" color="text.secondary" component="div">
      {label}
    </Typography>
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Typography
        variant="body2"
        sx={{ fontFamily: "monospace", color: "text.primary" }}
        title={address}
        data-testid={testId}
      >
        {truncateAddress(address)}
      </Typography>
      <CopyButton
        textToCopy={address}
        size="small"
        tooltipText={`Copy ${label.toLowerCase()}`}
      />
    </Stack>
  </Box>
);

interface ConnectButtonProps {
  sx?: SxProps<Theme>;
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
  const outpost = useOutpostAccount();
  const wagmiReady = useWagmiReady();
  const { data, isLoading } = useUserQuery(outpost.address);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const showOwner =
    !!outpost.ownerAddress &&
    !!outpost.address &&
    outpost.ownerAddress.toLowerCase() !== outpost.address.toLowerCase();

  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        mounted,
        openConnectModal,
      }) => {
        const view = connectButtonView({
          mounted,
          wagmiReady,
          hasAccount: !!account,
          userLoading: isLoading,
          identityLoading: outpost.isLoading,
          address: outpost.address,
        });

        if (view === "skeleton") {
          return <ConnectButtonSkeleton fullWidth={fullWidth} sx={sx} />;
        }

        if (view === "connect") {
          return (
            <Button
              variant={variant || "outlined"}
              onClick={openConnectModal}
              data-testid="wallet-connect"
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

        const societyAddress = outpost.address as Address;

        const handleClick = (event: MouseEvent<HTMLElement>) => {
          if (chain?.unsupported) {
            openChainModal();
            return;
          }
          setMenuAnchor(event.currentTarget);
        };

        const closeMenu = () => setMenuAnchor(null);

        return (
          <>
            <Tooltip
              title={
                chain?.unsupported
                  ? "Wrong network — click to switch"
                  : undefined
              }
              arrow
            >
              <Button
                variant={variant || "wallet"}
                onClick={handleClick}
                aria-haspopup="menu"
                data-testid="wallet-account-button"
                aria-expanded={menuAnchor ? "true" : undefined}
                sx={mergeSx(
                  sx,
                  chain?.unsupported && {
                    border: (theme) => `1px solid ${theme.palette.error.dark}`,
                  },
                )}
                fullWidth={fullWidth}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  flexGrow={1}
                  spacing={{ xs: 0.5, sm: 0.75, md: 1 }}
                >
                  <Avatar
                    address={societyAddress}
                    ensImage={data?.imageUrl}
                    size={24}
                    loading={isLoading}
                  />
                  <Typography
                    component="span"
                    whiteSpace="nowrap"
                    flexGrow={1}
                    textAlign="left"
                  >
                    {data?.name || truncateAddress(societyAddress)}
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
            <Menu
              anchorEl={menuAnchor}
              open={!!menuAnchor}
              onClose={closeMenu}
              data-testid="wallet-account-menu"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <AccountMenuRow
                label="Society address"
                testId="wallet-society-address"
                address={societyAddress}
              />
              {showOwner && (
                <AccountMenuRow
                  label="Wallet (owner)"
                  testId="wallet-owner-address"
                  address={outpost.ownerAddress as Address}
                />
              )}
              <Divider />
              <MenuItem
                data-testid="wallet-settings"
                onClick={() => {
                  closeMenu();
                  openAccountModal();
                }}
              >
                Wallet settings
              </MenuItem>
            </Menu>
          </>
        );
      }}
    </RainbowConnectButton.Custom>
  );
};
