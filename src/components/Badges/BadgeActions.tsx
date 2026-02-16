import { Stack, Tabs, Tab, Box, Skeleton } from "@mui/material";
import { useMemo, useState } from "react";
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

  const [tab, setTab] = useState<TabKey | false>(false);

  // Reconcile tab state with available actions
  const validTab = useMemo(() => {
    if (available.length === 0) return false;
    
    // Check if current tab is still available
    const isCurrentTabAvailable = available.some((a) => a.key === tab);
    if (isCurrentTabAvailable) return tab;
    
    // If not, return first available
    return available[0]?.key ?? false;
  }, [available, tab]);

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

  if (!validTab) {
    return null;
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
          value={validTab}
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

      {validTab === "mint" && <MintTab id={id} />}
      {validTab === "transfer" && (
        <Box marginTop={2}>Transfer functionality is not available yet.</Box>
      )}
      {validTab === "burn" && (
        <Box marginTop={2}>Burn functionality is not available yet.</Box>
      )}
    </Box>
  );
};
