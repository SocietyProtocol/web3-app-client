"use client";

import { Stack } from "@mui/material";
import { TierCard } from "./TierCard";
import { TIERS } from "./consts";
import { TierId } from "./types";

interface TierSelectorProps {
  selectedTierId: TierId;
  onSelect: (tierId: TierId) => void;
}

export const TierSelector = ({
  selectedTierId,
  onSelect,
}: TierSelectorProps) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    spacing={1.5}
    sx={{ width: "100%" }}
  >
    {TIERS.map((tier) => (
      <TierCard
        key={tier.id}
        tier={tier}
        selected={selectedTierId === tier.id}
        onSelect={() => onSelect(tier.id)}
      />
    ))}
  </Stack>
);
