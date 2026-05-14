// ─── row ────────────────────────────────────────────────────────────────────

import {
  Box,
  capitalize,
  Chip,
  IconButton,
  Stack,
  SxProps,
  Theme,
  Tooltip,
  Typography,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { LockHistoryItem, LockOperationType } from "./types";
import { TokenIcon } from "@/components/TokenIcon/TokenIcon";
import { FormattedNumber } from "@/components/FormattedNumber/FormattedNumber";
import { SPEC_DECIMALS } from "../consts";
import { formatDateInSeconds } from "@/utils/date";
import { useExplorerLinkBuilder } from "@/hooks/useExplorerLinkBuilder";
import Link from "next/link";

const mobileLabelSx: SxProps<Theme> = {
  display: { xs: "block", sm: "none" },
  fontSize: "0.65rem",
  fontWeight: 600,
  color: "text.secondary",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  mb: 0.25,
};

export const HistoryRow = ({ item }: { item: LockHistoryItem }) => {
  const buildExplorerLink = useExplorerLinkBuilder();
  const explorerHref = buildExplorerLink({ tx: item.id });
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
      <Stack>
        <Typography sx={mobileLabelSx}>Amount</Typography>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={{ xs: "flex-start", sm: "center" }}
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
      </Stack>

      {/* Lock Date */}
      <Stack>
        <Typography sx={mobileLabelSx}>Lock Date</Typography>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={{ xs: "flex-start", sm: "center" }}
        >
          <Typography variant="body2" color="text.primary">
            {item.lockDate != null ? formatDateInSeconds(item.lockDate) : "—"}
          </Typography>
        </Stack>
      </Stack>

      {/* Unlock Date */}
      <Stack>
        <Typography sx={mobileLabelSx}>Unlock Date</Typography>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={{ xs: "flex-start", sm: "center" }}
        >
          <Typography variant="body2" color="text.primary">
            {item.unlockDate != null
              ? formatDateInSeconds(item.unlockDate)
              : "—"}
          </Typography>
        </Stack>
      </Stack>

      {/* Operation — includes inline explorer link on xs */}
      <Stack>
        <Typography sx={mobileLabelSx}>Operation</Typography>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={{ xs: "flex-start", sm: "center" }}
          spacing={1}
        >
          <Chip
            label={capitalize(item.type)}
            color={
              item.type === LockOperationType.Lock ? "secondary" : "success"
            }
            size="small"
            sx={{ fontWeight: 600, fontSize: "0.75rem", userSelect: "none" }}
          />
          <Tooltip title="View on explorer">
            <IconButton
              size="small"
              component={Link}
              href={explorerHref}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: { xs: "inline-flex", sm: "none" },
                p: 0.25,
                color: "text.secondary",
              }}
            >
              <OpenInNewIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Explorer link column — sm+ only */}
      <Tooltip title="View on explorer">
        <IconButton
          size="small"
          component={Link}
          href={explorerHref}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: { xs: "none", sm: "inline-flex" },
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
