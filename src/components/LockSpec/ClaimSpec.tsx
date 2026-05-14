"use client";

import { ReactNode } from "react";
import { Skeleton, Stack, Typography } from "@mui/material";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { TokenIcon } from "@/components/TokenIcon/TokenIcon";
import { TransactionButton } from "@/components/Transaction/TransactionButton";
import { WithTooltip } from "@/components/WithTooltip/WithTooltip";
import { FormattedNumber } from "@/components/FormattedNumber/FormattedNumber";
import { formatAuto } from "@/utils/format";
import { SPEC_DECIMALS } from "./consts";
import { useCurrentLock } from "./useCurrentLock";
import { useClaimMutation } from "./useClaimMutation";
import { SimulationError } from "../Transaction/SimulationError";
import { DataRow } from "./DataRow";
import { GasEstimation } from "../Transaction/GasEstimation";
import { formatDateInSeconds } from "@/utils/date";

interface ClaimDataColumnProps {
  label: string;
  tooltip: string;
  value: ReactNode;
  loading?: boolean;
}

const ClaimDataColumn = ({
  label,
  tooltip,
  value,
  loading,
}: ClaimDataColumnProps) => (
  <Stack spacing={1} flex={1}>
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Typography variant="caption" color="primary.main">
        {label}
      </Typography>
      <WithTooltip tooltip={tooltip} sx={{ fontSize: "0.875rem" }} />
    </Stack>
    {loading ? <Skeleton width={80} height={28} /> : value}
  </Stack>
);

function formatClaimLabel(amount: bigint): string {
  const compact = formatAuto(formatUnits(amount, SPEC_DECIMALS), {
    compact: true,
  });

  return `CLAIM ${compact} SPEC`;
}

export const ClaimSpec = () => {
  const { address } = useAccount();
  const currentLock = useCurrentLock({ address });
  const claimMutation = useClaimMutation();

  const {
    amount,
    unlockTime,
    isLocked,
    canClaim,
    isLoading: isLoadingLock,
  } = currentLock;

  const {
    mutate: onClaim,
    isTransactionPending,
    simulation: { isFetching: isSimulating, isError, error: simulationError },
    gas,
    gasError,
    gasLoading,
  } = claimMutation;

  const hasLock = amount !== undefined && amount > BigInt(0);
  const buttonLabel = hasLock
    ? isLocked
      ? "Wait until lock period is over"
      : formatClaimLabel(amount)
    : "CLAIM SPEC";

  const disabled =
    !canClaim ||
    isLocked ||
    isLoadingLock ||
    isTransactionPending ||
    isSimulating ||
    isError;

  return (
    <Stack spacing={3}>
      {/* 3-column data row */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
        <ClaimDataColumn
          label="Locked Balance"
          tooltip="The amount of SPEC tokens currently locked in the protocol."
          loading={isLoadingLock}
          value={
            <Stack direction="row" alignItems="center" spacing={1}>
              <TokenIcon symbol="spec" size={28} />
              <FormattedNumber
                value={amount}
                scaleDownDecimals={SPEC_DECIMALS}
                suffix="SPEC"
                variant="h6"
                color="primary.main"
                sx={{ fontWeight: 700 }}
                compact
              />
            </Stack>
          }
        />

        <ClaimDataColumn
          label="Unlock Date"
          tooltip="The date when your locked tokens become available to claim."
          loading={isLoadingLock}
          value={
            <Typography
              variant="h6"
              color="primary.main"
              sx={{ fontWeight: 700 }}
            >
              {unlockTime !== undefined ? formatDateInSeconds(unlockTime) : "—"}
            </Typography>
          }
        />

        <ClaimDataColumn
          label="Status"
          tooltip="Current status of your locked tokens."
          loading={isLoadingLock}
          value={
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: canClaim ? "success.light" : "primary.main",
              }}
            >
              {canClaim ? "Claimable" : hasLock ? "Locked" : "—"}
            </Typography>
          }
        />
      </Stack>

      {!disabled && (
        <DataRow
          label="Est. Gas"
          content={
            <GasEstimation
              value={gas}
              isLoading={gasLoading}
              isError={gasError}
              sx={{ color: "primary.100" }}
            />
          }
        />
      )}

      <SimulationError error={simulationError} />

      {/* Claim button */}
      <TransactionButton
        variant="contained"
        size="large"
        fullWidth
        disabled={disabled}
        onClick={onClaim}
        loading={isTransactionPending || isLoadingLock}
        loadingText={isLoadingLock ? "Loading..." : "Claiming..."}
        simulating={isSimulating}
        sx={{ py: 1.5, fontWeight: 700, letterSpacing: 1 }}
      >
        {buttonLabel}
      </TransactionButton>
    </Stack>
  );
};
