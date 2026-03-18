"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useChainVar } from "@/hooks/useChainVar";
import { tokens } from "@/consts/tokens";
import { useFullBalanceOf } from "@/hooks/erc20/useFullBalance";
import { LockSpec } from "./LockSpec";
import { ContentGuard } from "@/components/Bubbles/ContentGuard";
import { Stack, Tab, Tabs, Typography } from "@mui/material";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { LockDuration, LockSpecTab, TierId } from "./types";
import { TIERS } from "./consts";
import { useLockMutation } from "./useLockMutation";
import { SECONDS_PER_YEAR_BN } from "@/consts/time";

export const LockSpecContent = () => {
  const { address } = useAccount();
  const tokenAddress = useChainVar(tokens.spec);

  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringEnum([
      LockSpecTab.LOCK,
      LockSpecTab.CLAIM,
      LockSpecTab.HISTORY,
    ]).withDefault(LockSpecTab.LOCK),
  );

  const [selectedTierId, setSelectedTierId] = useState<TierId>(TierId.SILVER);
  const [selectedDuration, setSelectedDuration] = useState<LockDuration>(
    LockDuration.THREE_YEARS,
  );

  const { rawBalance: specRawBalance } = useFullBalanceOf({
    address,
    tokenAddress,
  });

  const selectedTier = TIERS.find((t) => t.id === selectedTierId)!;
  const durationInSeconds = BigInt(selectedDuration) * SECONDS_PER_YEAR_BN;

  const lockMutation = useLockMutation({
    amount: selectedTier.requiredSpec,
    durationInSeconds,
  });

  return (
    <Stack
      spacing={{ xs: 6, md: 8 }}
      sx={{
        py: { xs: 2, md: 3 },
        px: { xs: 2, sm: 0 },
        width: "100%",
        alignItems: "center",
        position: "relative",
      }}
    >
      <Typography variant="h4" component="h1" color="primary.main">
        Lock SPEC
      </Typography>
      <Stack spacing={4} sx={{ maxWidth: 1000 }}>
        <ContentGuard requireNetwork requireAccount>
          <Tabs
            className="pill fullwidth highcontrast"
            value={tab}
            onChange={(_, newValue) => setTab(newValue)}
          >
            <Tab label="Lock" value={LockSpecTab.LOCK} disableRipple />
            <Tab label="Claim" value={LockSpecTab.CLAIM} disableRipple />
            <Tab label="History" value={LockSpecTab.HISTORY} disableRipple />
          </Tabs>
          <LockSpec
            balance={specRawBalance.data}
            selectedTierId={selectedTierId}
            onTierChange={setSelectedTierId}
            selectedDuration={selectedDuration}
            onDurationChange={setSelectedDuration}
            onLock={lockMutation.mutate}
            loading={lockMutation.isLoading}
            simulating={lockMutation.simulation.isFetching}
            approveRequired={lockMutation.approveRequired}
            gas={lockMutation.gas}
            gasLoading={lockMutation.gasLoading}
            gasError={lockMutation.gasError}
          />
        </ContentGuard>
      </Stack>
    </Stack>
  );
};
