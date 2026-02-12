import { Stack, Tabs, Tab, Box } from "@mui/material";
import { useState } from "react";
import { WithTooltip } from "../WithTooltip/WithTooltip";
import { MintTab } from "./MintTab";

interface BadgeActionsProps {
  canMint: boolean;
  canBurn: boolean;
  canTransfer: boolean;
}

export const BadgeActions = ({
  canMint,
  canBurn,
  canTransfer,
}: BadgeActionsProps) => {
  const actions = [
    { key: "mint", label: "Mint", enabled: canMint },
    { key: "transfer", label: "Transfer", enabled: canTransfer },
    { key: "burn", label: "Burn", enabled: canBurn, color: "error" },
  ];

  const available = actions.filter((a) => a.enabled);
  const [value, setValue] = useState<string | false>(
    available.length ? available[0].key : false,
  );

  if (!available.length) return null;

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
          value={value}
          onChange={(_, v) => setValue(v)}
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

      {value === "mint" && <MintTab />}
    </Box>
  );
};
