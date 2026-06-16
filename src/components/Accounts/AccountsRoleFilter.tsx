"use client";

import {
  Box,
  Chip,
  Stack,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { TierToggleButton } from "../Communities/Tier/TierToggleButton";

export enum AccountRoleFilter {
  Governors = "governors",
  Contributors = "contributors",
  CoreTeam = "core-team",
  Advisors = "advisors",
  Moderators = "moderators",
  Basic = "basic",
}

const FILTER_ORDER: AccountRoleFilter[] = [
  AccountRoleFilter.Governors,
  AccountRoleFilter.Contributors,
  AccountRoleFilter.CoreTeam,
  AccountRoleFilter.Advisors,
  AccountRoleFilter.Moderators,
  AccountRoleFilter.Basic,
];

const FILTER_LABELS: Record<AccountRoleFilter, string> = {
  [AccountRoleFilter.Governors]: "Governors",
  [AccountRoleFilter.Contributors]: "Contributors",
  [AccountRoleFilter.CoreTeam]: "Core Team",
  [AccountRoleFilter.Advisors]: "Advisors",
  [AccountRoleFilter.Moderators]: "Moderators",
  [AccountRoleFilter.Basic]: "Basic accounts",
};

const FILTER_ICONS: Record<AccountRoleFilter, typeof VerifiedIcon> = {
  [AccountRoleFilter.Governors]: VerifiedIcon,
  [AccountRoleFilter.Contributors]: HandymanOutlinedIcon,
  [AccountRoleFilter.CoreTeam]: GroupsOutlinedIcon,
  [AccountRoleFilter.Advisors]: LightbulbOutlinedIcon,
  [AccountRoleFilter.Moderators]: ShieldOutlinedIcon,
  [AccountRoleFilter.Basic]: PersonOutlineIcon,
};

/**
 * Multi-select role filter for the Accounts page. The UI is wired up but
 * filtering itself is disabled — the subgraph `User_filter` does not yet
 * support filtering users by their `badges_` relation, so toggling has no
 * effect on the listing. Surfaced behind a "Coming soon" badge.
 */
export const AccountsRoleFilter = () => {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{ flexWrap: "wrap", rowGap: 1 }}
    >
      <Tooltip title="Filtering by role is coming soon" placement="top" arrow>
        <Box sx={{ display: "inline-flex", alignItems: "center" }}>
          <ToggleButtonGroup
            value={FILTER_ORDER}
            aria-label="Filter by account role (coming soon)"
            disabled
            sx={{ flexWrap: "wrap", gap: 2, opacity: 0.6 }}
          >
            {FILTER_ORDER.map((filter) => {
              const Icon = FILTER_ICONS[filter];
              const color = theme.palette.text.primary;

              return (
                <TierToggleButton
                  key={filter}
                  value={filter}
                  tierColor={color}
                  aria-label={FILTER_LABELS[filter]}
                  sx={{ textTransform: "none" }}
                >
                  <Icon sx={{ fontSize: 18, color }} />
                  <Typography
                    variant="body2"
                    sx={{
                      color,
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      lineHeight: 1,
                      userSelect: "none",
                    }}
                  >
                    {FILTER_LABELS[filter]}
                  </Typography>
                </TierToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </Box>
      </Tooltip>
      <Chip
        label="Coming soon"
        size="small"
        sx={{
          height: 20,
          fontSize: "0.7rem",
          fontWeight: 600,
        }}
      />
    </Stack>
  );
};
