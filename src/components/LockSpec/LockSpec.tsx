"use client";

import { Paper, Stack, Typography } from "@mui/material";
import { TierSelector } from "./TierSelector";
import { LockSummary } from "./LockSummary";
import { TIERS, SPEC_DECIMALS } from "./consts";
import { LockDuration, TierId } from "./types";
import { TransactionButton } from "@/components/Transaction/TransactionButton";
import { DataRow } from "./DataRow";
import { LockDurationPicker } from "./LockDurationPicker";
import { WithTooltip } from "../WithTooltip/WithTooltip";
import { GasEstimation } from "../Transaction/GasEstimation";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";

interface LockSpecProps {
  balance?: bigint;
  selectedTierId: TierId;
  onTierChange: (tierId: TierId) => void;
  selectedDuration: LockDuration;
  onDurationChange: (duration: LockDuration) => void;
  onLock: () => void;
  loading?: boolean;
  simulating?: boolean;
  approveRequired?: boolean;
  gas?: bigint;
  gasLoading?: boolean;
  gasError?: boolean;
}

export const LockSpec = ({
  balance,
  selectedTierId,
  onTierChange,
  selectedDuration,
  onDurationChange,
  onLock,
  loading = false,
  simulating = false,
  approveRequired = false,
  gas,
  gasLoading,
  gasError,
}: LockSpecProps) => {
  const selectedTier = TIERS.find((t) => t.id === selectedTierId)!;
  const canAfford =
    balance === undefined || balance >= selectedTier.requiredSpec;

  const buttonLabel = approveRequired
    ? "APPROVE SPEC"
    : `LOCK ${selectedTier.requiredSpecLabel}`;

  return (
    <Paper
      elevation={0}
      sx={{
        padding: { xs: 2, sm: 3 },
        maxWidth: { xs: "100%", lg: 1200 },
        width: { xs: "100%", lg: "auto" },
        minWidth: { xs: "100%", sm: 800 },
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        gap: 3,
        bgcolor: "background.paper",
      }}
    >
      <Stack spacing={3}>
        {/* Balance */}
        <Stack alignItems="center" spacing={0.5}>
          <Typography variant="caption" color="primary.main">
            Your balance
          </Typography>

          <FormattedNumber
            value={balance}
            scaleDownDecimals={SPEC_DECIMALS}
            minThreshold={1000}
            suffix=" SPEC"
            variant="h5"
            color="primary.main"
            sx={{ fontWeight: 700 }}
            hideTooltip
          />
        </Stack>

        {/* Tier selection */}
        <TierSelector selectedTierId={selectedTierId} onSelect={onTierChange} />

        <DataRow
          label="Time to unlock"
          content={
            <Stack direction="row" alignItems="center" spacing={1}>
              <LockDurationPicker
                selected={selectedDuration}
                onSelect={onDurationChange}
              />
              <WithTooltip
                tooltip="Lock duration determines how long your SPEC tokens will be locked. Longer durations grant more governance influence."
                sx={{ fontSize: "1rem" }}
              />
            </Stack>
          }
        />

        <DataRow
          label="Est. Gas"
          content={
            <GasEstimation
              value={gas}
              isLoading={gasLoading}
              isError={gasError}
              sx={{
                color: "primary.100",
              }}
            />
          }
        />

        {/* Lock button */}
        <TransactionButton
          variant="contained"
          size="large"
          fullWidth
          disabled={!canAfford}
          onClick={onLock}
          loading={loading}
          simulating={simulating}
          sx={{ py: 1.5, fontWeight: 700, letterSpacing: 1 }}
        >
          {!canAfford ? "Insufficient Balance" : buttonLabel}
        </TransactionButton>

        {/* Summary */}
        <LockSummary tier={selectedTier} duration={selectedDuration} />
      </Stack>
    </Paper>
  );
};
