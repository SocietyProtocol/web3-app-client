// ─── row ────────────────────────────────────────────────────────────────────

import {
  Box,
  capitalize,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { LockOperationType } from "./types";
import { TokenIcon } from "@/components/TokenIcon/TokenIcon";
import { FormattedNumber } from "@/components/FormattedNumber/FormattedNumber";
import { SPEC_DECIMALS } from "../consts";
import { formatDate } from "@/utils/date";
import { LockTransaction } from "../../../../.graphclient";
import { useExplorerLinkBuilder } from "@/hooks/useExplorerLinkBuilder";
import Link from "next/link";

export const HistoryRow = ({
  item,
}: {
  item: Pick<
    LockTransaction,
    "id" | "type" | "amount" | "lockDate" | "unlockDate"
  >;
}) => {
  const buildExplorerLink = useExplorerLinkBuilder();
  // Subgraph IDs are typically `txHash` or `txHash-logIndex`
  const txHash = item.id.split("-")[0] as `0x${string}`;
  const explorerHref = buildExplorerLink({ tx: txHash });

  const amountBn = BigInt(item.amount);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr) 0.2fr" },
        gap: { xs: 2, sm: 0 },
        alignItems: "center",
        px: 2,
        py: 2,
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        "&:last-child": { borderBottom: "none" },
      }}
    >
      {/* Amount */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={1}
      >
        <TokenIcon symbol="spec" size={24} />
        <FormattedNumber
          value={amountBn}
          scaleDownDecimals={SPEC_DECIMALS}
          suffix=" SPEC"
          variant="body2"
          fontWeight={700}
          color="primary.main"
          compact
        />
      </Stack>

      {/* Lock Date */}
      <Stack direction="row" alignItems="center" justifyContent="center">
        <Typography variant="body2" color="text.primary">
          {formatDate(item.lockDate)}
        </Typography>
      </Stack>

      {/* Unlock Date */}
      <Stack direction="row" alignItems="center" justifyContent="center">
        <Typography variant="body2" color="text.primary">
          {item.unlockDate != null ? formatDate(item.unlockDate) : "—"}
        </Typography>
      </Stack>

      {/* Operation */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={1}
      >
        <Chip
          label={capitalize(item.type)}
          color={item.type === LockOperationType.Lock ? "secondary" : "success"}
          size="small"
          sx={{ fontWeight: 600, fontSize: "0.75rem", userSelect: "none" }}
        />
      </Stack>
      <Tooltip title="View on explorer">
        <IconButton
          size="small"
          component={Link}
          href={explorerHref}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            p: 0.5,
            color: "text.primary",
            width: "fit-content",
          }}
        >
          <OpenInNewIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
