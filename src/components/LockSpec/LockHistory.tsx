"use client";

import { useAccount } from "wagmi";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { useLockHistory, LockHistoryItem } from "./useLockHistory";
import { TokenIcon } from "@/components/TokenIcon/TokenIcon";
import { FormattedNumber } from "@/components/FormattedNumber/FormattedNumber";
import { SPEC_DECIMALS } from "./consts";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type LockStatus =
  | { label: "Claimed"; color: string }
  | { label: "Locked"; color: string }
  | { label: string; color: string }; // "Unlocks in X days"

function getLockStatus(unlockTime: bigint, claimed: boolean): LockStatus {
  if (claimed) return { label: "Claimed", color: "success.light" };

  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
  const daysRemaining = Number(unlockTime - nowSeconds) / 86400;

  if (daysRemaining <= 0) return { label: "Claimable", color: "warning.main" };
  if (daysRemaining <= 90)
    return {
      label: `Unlocks in ${Math.ceil(daysRemaining)} days`,
      color: "warning.main",
    };
  return { label: "Locked", color: "primary.main" };
}

// ─── header ─────────────────────────────────────────────────────────────────

const COLUMNS = ["Amount", "Lock Date", "Unlock Date", "Status"];

const HistoryHeader = () => (
  <Box
    sx={{
      display: { xs: "none", sm: "grid" },
      gridTemplateColumns: "repeat(4, 1fr)",
      px: 2,
      pb: 1,
    }}
  >
    {COLUMNS.map((col) => (
      <Typography
        key={col}
        variant="caption"
        sx={{
          color: "text.primary",
          textTransform: "uppercase",
          fontWeight: 600,
          letterSpacing: 1,
        }}
      >
        {col}
      </Typography>
    ))}
  </Box>
);

// ─── row ────────────────────────────────────────────────────────────────────

const HistoryRowSkeleton = () => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
      gap: { xs: 2, sm: 0 },
      px: 2,
      py: 2,
      borderBottom: (theme) =>
        `1px solid ${theme.palette.border?.card ?? theme.palette.divider}`,
    }}
  >
    {[80, 90, 90, 60].map((w, i) => (
      <Skeleton key={i} width={w} height={24} />
    ))}
  </Box>
);

const HistoryRow = ({ item }: { item: LockHistoryItem }) => {
  const status = getLockStatus(item.unlockTime, item.claimed);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
        gap: { xs: 2, sm: 0 },
        alignItems: "center",
        px: 2,
        py: 2,
        borderBottom: (theme) =>
          `1px solid ${theme.palette.border?.card ?? theme.palette.divider}`,
        "&:last-child": { borderBottom: "none" },
      }}
    >
      {/* Amount */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <TokenIcon symbol="spec" size={24} />
        <FormattedNumber
          value={item.amount}
          scaleDownDecimals={SPEC_DECIMALS}
          suffix="SPEC"
          variant="body2"
          fontWeight={700}
          color="primary.main"
          compact
        />
      </Stack>

      {/* Lock Date */}
      <Typography variant="body2" color="text.primary">
        {item.lockTimestamp > BigInt(0) ? formatDate(item.lockTimestamp) : "—"}
      </Typography>

      {/* Unlock Date */}
      <Typography variant="body2" color="text.primary">
        {formatDate(item.unlockTime)}
      </Typography>

      {/* Status */}
      <Typography variant="body2" fontWeight={600} sx={{ color: status.color }}>
        {status.label}
      </Typography>
    </Box>
  );
};

// ─── main ────────────────────────────────────────────────────────────────────

export const LockHistory = () => {
  const { address } = useAccount();
  const { data: history, isLoading } = useLockHistory(address);

  return (
    <Stack>
      <Typography
        variant="h6"
        color="primary.main"
        sx={{ fontWeight: 700, mb: 2 }}
      >
        SPEC Lock Activity
      </Typography>

      <HistoryHeader />

      {isLoading ? (
        <>
          {Array.from({ length: 3 }).map((_, i) => (
            <HistoryRowSkeleton key={i} />
          ))}
        </>
      ) : !history?.length ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 6 }}
        >
          No lock activity found.
        </Typography>
      ) : (
        history.map((item) => <HistoryRow key={item.id} item={item} />)
      )}
    </Stack>
  );
};
