import {
  IconButton,
  Link,
  Stack,
  SxProps,
  Theme,
  Tooltip,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { truncateAddress } from "@/utils/string";
import { useExplorerLinkBuilder } from "@/hooks/useExplorerLinkBuilder";
import { mergeSx } from "@/utils/sx";
import { useMemo } from "react";
import { CopyButton } from "../CopyButton/CopyButton";
import { Address } from "viem";

interface AddressProps {
  address: Address;
  truncate?: boolean;
  showCopy?: boolean;
  showLink?: boolean;
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
}

export const AddressDisplay = ({
  address,
  truncate = false,
  showCopy = false,
  showLink = false,
  size = "medium",
  sx,
}: AddressProps) => {
  const buildExplorerLink = useExplorerLinkBuilder();

  const displayAddress = useMemo(
    () => (truncate ? truncateAddress(address) : address),
    [address, truncate],
  );

  const explorerUrl = useMemo(
    () => buildExplorerLink({ address }),
    [buildExplorerLink, address],
  );

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{ minWidth: 0, mt: 0 }}
    >
      <Typography
        variant="body2"
        sx={mergeSx(
          {
            fontFamily: "monospace",
            color: "text.primary",
            fontSize: size === "small" ? "0.875rem" : "1rem",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
          sx,
        )}
        title={address}
      >
        {displayAddress}
      </Typography>

      {showCopy && (
        <CopyButton
          textToCopy={address}
          size={size}
          tooltipText="Copy address"
        />
      )}

      {showLink && (
        <Tooltip title="View on Block Explorer">
          <IconButton
            size="small"
            component={Link}
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              p: size === "small" ? 0.25 : 0.5,
              color: "text.primary",
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
