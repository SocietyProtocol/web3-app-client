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
}: {
  label: string;
  address: Address;
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
        mounted: wagmiReady,
        openConnectModal,
      }) => {
        // Until the Society address is known, show nothing copyable: the
        // wallet address is not the member's identity.
        if (
          !wagmiReady ||
          isLoading ||
          (account && (outpost.isLoading || !outpost.address))
        ) {
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
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <AccountMenuRow
                label="Society address"
                address={societyAddress}
              />
              {showOwner && (
                <AccountMenuRow
                  label="Wallet (owner)"
                  address={outpost.ownerAddress as Address}
                />
              )}
              <Divider />
              <MenuItem
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
