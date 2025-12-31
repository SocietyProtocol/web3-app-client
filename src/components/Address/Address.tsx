import {
  IconButton,
  Link,
  Stack,
  SxProps,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Hex } from "viem";
import { truncateAddress } from "@/utils/string";
import { useExplorerLinkBuilder } from "@/hooks/useExplorerLinkBuilder";
import { useCallback, useMemo, useState } from "react";

interface AddressProps {
  address: Hex;
  truncate?: boolean;
  showCopy?: boolean;
  showLink?: boolean;
  size?: "small" | "medium";
  sx?: SxProps;
}

export const Address = ({
  address,
  truncate = false,
  showCopy = false,
  showLink = false,
  size = "medium",
  sx,
}: AddressProps) => {
  const [copied, setCopied] = useState(false);
  const buildExplorerLink = useExplorerLinkBuilder();

  const displayAddress = useMemo(
    () => (truncate ? truncateAddress(address) : address),
    [address, truncate]
  );

  const explorerUrl = useMemo(
    () => buildExplorerLink({ address }),
    [buildExplorerLink, address]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  }, [address]);

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{ minWidth: 0, mt: 0 }}
    >
      <Typography
        variant="body2"
        sx={{
          fontFamily: "monospace",
          color: "text.primary",
          opacity: 0.7,
          fontSize: "14px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          ...(size === "small" ? { fontSize: "0.625rem" } : {}),
          ...sx,
        }}
        title={truncate ? address : undefined}
      >
        {displayAddress}
      </Typography>

      {showCopy && (
        <Tooltip title={copied ? "Copied!" : "Copy address"}>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{
              p: size === "small" ? 0.25 : 0.5,
              color: "text.secondary",
              "&:hover": {
                color: "text.primary",
                opacity: 0.8,
              },
            }}
          >
            {copied ? (
              <CheckIcon
                sx={{ fontSize: size === "small" ? "0.625rem" : 16 }}
              />
            ) : (
              <ContentCopyIcon
                sx={{ fontSize: size === "small" ? "0.625rem" : 16 }}
              />
            )}
          </IconButton>
        </Tooltip>
      )}

      {showLink && (
        <Tooltip title="View on Etherscan">
          <IconButton
            size="small"
            component={Link}
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              p: size === "small" ? 0.25 : 0.5,
              color: "text.secondary",
              "&:hover": {
                color: "text.primary",
                opacity: 0.8,
              },
            }}
          >
            <OpenInNewIcon
              sx={{ fontSize: size === "small" ? "0.625rem" : 16 }}
            />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
};
