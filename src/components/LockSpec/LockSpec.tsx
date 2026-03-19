"use client";

import { useMemo, useState } from "react";
import { Stack, Typography } from "@mui/material";
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
import { useLockMutation } from "./useLockMutation";
import { useFullBalanceOf } from "@/hooks/erc20/useFullBalance";
import { useAccount } from "wagmi";
import { useChainVar } from "@/hooks/useChainVar";
import { tokens } from "@/consts/tokens";
import { SimulationError } from "../Transaction/SimulationError";
import { useLockParameters } from "./useLockParameters";

export const LockSpec = () => {
  const [selectedTierId, setSelectedTierId] = useState<TierId>(TierId.SILVER);
  const [selectedDuration, setSelectedDuration] = useState<LockDuration>(
    LockDuration.THREE_YEARS,
  );

  const { tierAmounts } = useLockParameters();

  const { address } = useAccount();
  const tokenAddress = useChainVar(tokens.spec);
  const {
    rawBalance: { data: balance },
  } = useFullBalanceOf({
    address,
    tokenAddress,
  });

  const selectedTier = useMemo(
    () => TIERS.find((t) => t.id === selectedTierId)!,
    [selectedTierId],
  );

  const durationInSeconds = useMemo(
    () => BigInt(selectedDuration) * BigInt(1000000),
    [selectedDuration],
  );

  const lockMutation = useLockMutation({
    amount: tierAmounts[selectedTierId].data,
    durationInSeconds,
  });

  const canAfford =
    balance !== undefined && tierAmounts[selectedTierId].data !== undefined
      ? balance >= tierAmounts[selectedTierId].data
      : undefined;

  const buttonLabel = lockMutation.approveRequired
    ? "APPROVE SPEC"
    : `LOCK ${selectedTier.requiredSpecLabel}`;

  return (
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
      <TierSelector
        selectedTierId={selectedTierId}
        onSelect={setSelectedTierId}
      />

      <DataRow
        label="Time to unlock"
        content={
          <Stack direction="row" alignItems="center" spacing={1}>
            <LockDurationPicker
              selected={selectedDuration}
              onSelect={setSelectedDuration}
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
            value={lockMutation.gas}
            isLoading={lockMutation.gasLoading}
            isError={lockMutation.gasError}
            sx={{ color: "primary.100" }}
          />
        }
      />

      <SimulationError error={lockMutation.simulation.error} />

      {/* Lock button */}
      <TransactionButton
        variant="contained"
        size="large"
        fullWidth
        disabled={
          !canAfford ||
          lockMutation.isLoading ||
          lockMutation.isMutating ||
          lockMutation.simulation.isFetching ||
          lockMutation.simulation.isError
        }
        onClick={lockMutation.mutate}
        loading={lockMutation.isLoading}
        simulating={lockMutation.simulation.isFetching}
        sx={{ py: 1.5, fontWeight: 700, letterSpacing: 1 }}
      >
        {!canAfford ? "Insufficient Balance" : buttonLabel}
      </TransactionButton>

      {/* Summary */}
      <LockSummary tier={selectedTier} duration={selectedDuration} />
    </Stack>
  );
};
