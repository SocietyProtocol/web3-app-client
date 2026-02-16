import { Stack, Tabs, Tab, Box, Skeleton, Typography } from "@mui/material";
import { useMemo, useState, useEffect } from "react";
import { WithTooltip } from "../WithTooltip/WithTooltip";
import { MintTab } from "./MintBadge/MintTab";

interface BadgeActionsProps {
  id: string;
  canMint: boolean;
  canBurn: boolean;
  canTransfer: boolean;
  loading?: boolean;
}

enum TabKey {
  MINT = "mint",
  TRANSFER = "transfer",
  BURN = "burn",
}

export const BadgeActions = ({
  id,
  canMint,
  canBurn,
  canTransfer,
  loading = false,
}: BadgeActionsProps) => {
  const actions = useMemo(
    () => [
      { key: TabKey.MINT, label: "Mint", enabled: canMint },
      { key: TabKey.TRANSFER, label: "Transfer", enabled: canTransfer },
      { key: TabKey.BURN, label: "Burn", enabled: canBurn, color: "error" },
    ],
    [canMint, canBurn, canTransfer],
  );

  const available = useMemo(() => actions.filter((a) => a.enabled), [actions]);

  const [tab, setTab] = useState<TabKey | false>(
    available.length ? (available[0]?.key ?? false) : false,
  );

  // Sync tab state when available actions change
  useEffect(() => {
    if (available.length === 0) {
      setTab(false);
      return;
    }

    // If current tab is not in available, switch to first available
    setTab((currentTab) => {
      const isCurrentTabAvailable = available.some((a) => a.key === currentTab);
      if (!isCurrentTabAvailable) {
        return available[0]?.key ?? false;
      }
      return currentTab;
    });
  }, [available]);

  if (loading) {
    return (
      <Box padding={1} paddingTop={4}>
        <WithTooltip
          variant="body1"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            fontSize: (theme) => theme.typography.pxToRem(16),
          }}
          tooltip="Actions you can perform with this badge"
        >
          Actions
        </WithTooltip>
        <Stack
          marginTop={2}
          spacing={2}
          sx={{
            width: "100%",
          }}
        >
          <Skeleton variant="rectangular" width="100%" height={40} />
        </Stack>
      </Box>
    );
  }

  if (!tab) {
    return (
      <Box padding={1} paddingTop={4}>
        <WithTooltip
          variant="body1"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            fontSize: (theme) => theme.typography.pxToRem(16),
          }}
          tooltip="Actions you can perform with this badge"
        >
          Actions
        </WithTooltip>
        <Typography
          variant="body2"
          sx={{
            mt: 2,
            color: "text.secondary",
          }}
        >
          No actions available for this badge.
        </Typography>
      </Box>
    );
  }

  return (
    <Box padding={1} paddingTop={4}>
      <WithTooltip
        variant="body1"
        sx={{
          fontWeight: 700,
          color: "text.primary",
          fontSize: (theme) => theme.typography.pxToRem(16),
        }}
        tooltip="Actions you can perform with this badge"
      >
        Actions
      </WithTooltip>
      <Stack
        marginTop={2}
        spacing={2}
        sx={{
          width: "100%",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="badge actions"
          sx={{
            minHeight: 40,
            borderBottom: (theme) => `1px solid ${theme.palette.primary.main}`,
            "& .MuiTabs-flexContainer": {
              justifyContent: "stretch",

              "& .MuiTab-root": {
                flex: 1,
              },
            },
          }}
        >
          {available.map((a) => (
            <Tab
              key={a.key}
              value={a.key}
              label={a.label}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                width: {
                  xs: "100%",
                  sm: 160,
                },
                color: a.color ? `${a.color}.light` : "text.primary",

                "&.Mui-selected": {
                  color: a.color ? `${a.color}.main` : "primary.main",
                },
              }}
            />
          ))}
        </Tabs>
      </Stack>

      {tab === "mint" && <MintTab id={id} />}
      {tab === "transfer" && (
        <Box marginTop={2}>Transfer functionality is not available yet.</Box>
      )}
      {tab === "burn" && (
        <Box marginTop={2}>Burn functionality is not available yet.</Box>
      )}
    </Box>
  );
};
