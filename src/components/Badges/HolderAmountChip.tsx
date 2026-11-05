import { Chip } from "@mui/material";
import {
  formatBadgeCount,
  formatVotingPower,
} from "@/data/badges/quantity";

interface HolderAmountChipProps {
  count: bigint;
  total?: bigint;
  /** Also show the share of the total supply (governance voting power). */
  showPercent?: boolean;
}

/** "2 / 15" or "10 / 15 · 66.67%" under a holder's card. */
export const HolderAmountChip = ({
  count,
  total,
  showPercent = false,
}: HolderAmountChipProps) => (
  <Chip
    label={
      showPercent
        ? formatVotingPower(count, total)
        : formatBadgeCount(count, total)
    }
    size="small"
    sx={{
      fontSize: (theme) => theme.typography.pxToRem(10),
      height: 18,
      "& .MuiChip-label": { px: 1.5, lineHeight: "18px" },
    }}
  />
);
