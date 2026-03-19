"use client";

import { LockSpec } from "./LockSpec";
import { ClaimSpec } from "./ClaimSpec";
import { ContentGuard } from "@/components/Bubbles/ContentGuard";
import { Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { LockSpecTab } from "./types";

export const LockSpecContent = () => {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringEnum([
      LockSpecTab.LOCK,
      LockSpecTab.CLAIM,
      LockSpecTab.HISTORY,
    ]).withDefault(LockSpecTab.LOCK),
  );

  return (
    <Stack
      spacing={{ xs: 6, md: 8 }}
      sx={{
        py: { xs: 2, md: 3 },
        px: { xs: 2, sm: 0 },
        width: "100%",
        alignItems: "center",
        position: "relative",
        minHeight: "800px",
      }}
    >
      <Typography variant="h4" component="h1" color="primary.main">
        Lock SPEC
      </Typography>
      <Stack spacing={4} sx={{ maxWidth: 1000, width: "100%" }}>
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
            {tab === LockSpecTab.LOCK && <LockSpec />}

            {tab === LockSpecTab.CLAIM && <ClaimSpec />}
          </Paper>
        </ContentGuard>
      </Stack>
    </Stack>
  );
};
