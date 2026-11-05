"use client";

import { Box, Button, Typography } from "@mui/material";
import { BubbleBase } from "../Bubbles/BubbleBase";
import { UserList } from "../User/UserList";
import { env } from "@/lib/env";
import { MarkdownRenderer } from "@/components/MarkdownRenderer/MarkdownRenderer";
import { useBadge } from "@/data/badges/useBadge";
import { GOVERNOR_BADGE_ID } from "@/consts/badges";
import {
  useBadgeHolderBalances,
  useBadgeTotalSupplies,
} from "@/data/badges/useBadgeQuantities";
import { HolderAmountChip } from "../Badges/HolderAmountChip";
import { useMemo } from "react";

export const Governance = () => {
  const { data, isLoading } = useBadge(GOVERNOR_BADGE_ID);
  const governors = useMemo(() => data?.badge?.holders ?? [], [data]);
  const governorIds = useMemo(() => governors.map((g) => g.id), [governors]);
  const { balances } = useBadgeHolderBalances(GOVERNOR_BADGE_ID, governorIds);
  const { supplies } = useBadgeTotalSupplies([GOVERNOR_BADGE_ID]);
  const totalSupply = supplies.get(GOVERNOR_BADGE_ID);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 6,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <MarkdownRenderer
            src="/api/copywriting/governance"
            replacements={{ snapshotSpecUrl: env.snapshotSpecUrl }}
            sx={{ maxWidth: 980, "& p, & li": { color: "text.primary" } }}
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
          <Box sx={{ width: { xs: "100%", md: "auto" }, minWidth: { md: 300 } }}>
            <BubbleBase
              variant="none"
              sx={{
                "& .MuiCardHeader-root": { padding: 2 },
                "& > .MuiCardContent-root": { padding: 2 },
                "& > .MuiCardActions-root": { padding: 2 },
              }}
              actions={
                <Button
                  variant="contained"
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    whiteSpace: "nowrap",
                  }}
                  href={env.snapshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Check Snapshot →
                </Button>
              }
            >
              <Typography
                variant="h5"
                sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
              >
                Governance
              </Typography>
            </BubbleBase>
          </Box>
          <Box sx={{ width: { xs: "100%", md: "auto" }, minWidth: { md: 300 } }}>
            <BubbleBase
              variant="none"
              sx={{
                "& .MuiCardHeader-root": { padding: 2 },
                "& > .MuiCardContent-root": { padding: 2 },
                "& > .MuiCardActions-root": { padding: 2 },
              }}
              actions={
                <Button
                  variant="outlined"
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    whiteSpace: "nowrap",
                  }}
                  href={env.snapshotSpecUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  SPEC Token Snapshot →
                </Button>
              }
            >
              <Typography
                variant="h5"
                sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
              >
                Expression of Feedback
              </Typography>
            </BubbleBase>
          </Box>
        </Box>
      </Box>

      <UserList
        title="Governors"
        users={governors}
        loading={isLoading}
        noUsersFoundText="No governors found"
        modalTitle="Governors"
        viewAllButtonText="View All Governors"
        andMoreText="And {count} more governors..."
        renderUserExtra={(user) => {
          const count = balances.get(user.id.toLowerCase());
          return count === undefined ? null : (
            <HolderAmountChip count={count} total={totalSupply} showPercent />
          );
        }}
        sx={{
          marginTop: 10,
        }}
      />
    </Box>
  );
};
