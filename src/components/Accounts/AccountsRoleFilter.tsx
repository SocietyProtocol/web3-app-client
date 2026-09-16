"use client";

import {
  ToggleButtonGroup,
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
import { ALL_ACCOUNT_ROLES, AccountRole } from "@/data/accounts/types";

const FILTER_LABELS: Record<AccountRole, string> = {
  [AccountRole.Governors]: "Governors",
  [AccountRole.Contributors]: "Contributors",
  [AccountRole.CoreTeam]: "Core Team",
  [AccountRole.Advisors]: "Advisors",
  [AccountRole.Moderators]: "Moderators",
  [AccountRole.Basic]: "Basic accounts",
};

const FILTER_ICONS: Record<AccountRole, typeof VerifiedIcon> = {
  [AccountRole.Governors]: VerifiedIcon,
  [AccountRole.Contributors]: HandymanOutlinedIcon,
  [AccountRole.CoreTeam]: GroupsOutlinedIcon,
  [AccountRole.Advisors]: LightbulbOutlinedIcon,
  [AccountRole.Moderators]: ShieldOutlinedIcon,
  [AccountRole.Basic]: PersonOutlineIcon,
};

export interface AccountsRoleFilterProps {
  value: AccountRole[];
  onChange: (next: AccountRole[]) => void;
}

export const AccountsRoleFilter = ({
  value,
  onChange,
}: AccountsRoleFilterProps) => {
  const theme = useTheme();
  const color = theme.palette.text.primary;

  return (
    <ToggleButtonGroup
      value={value}
      onChange={(_, next: AccountRole[]) => onChange(next ?? [])}
      aria-label="Filter by account role"
      sx={{ flexWrap: "wrap", gap: 2 }}
    >
      {ALL_ACCOUNT_ROLES.map((filter) => {
        const Icon = FILTER_ICONS[filter];

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
  );
};
