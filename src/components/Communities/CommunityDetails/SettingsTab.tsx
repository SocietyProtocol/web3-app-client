"use client";

import {
  Alert,
  AlertTitle,
  Avatar,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import { useMemo, useState } from "react";
import { useCommunityDetailsContext } from "./CommunityDetails.context";
import { EditCommunityInfoDialog } from "./Settings/EditCommunityInfoDialog";
import { TransferOwnershipDialog } from "./Settings/TransferOwnershipDialog";
import { EditBadgeDialog } from "./Settings/EditBadgeDialog";
import { BadgeSettingsCard } from "./Settings/BadgeSettingsCard";
import { BADGE_ROLE_LABELS, CommunityBadgeRole } from "./Settings/badgeTypes";

export function SettingsTab() {
  const { community, isManager } = useCommunityDetailsContext();
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [editBadgeOpen, setEditBadgeOpen] = useState<CommunityBadgeRole | null>(
    null,
  );

  const badges = useMemo(
    () => ({
      [CommunityBadgeRole.manager]: community?.managerBadge,
      [CommunityBadgeRole.assistant]: community?.assistantBadge,
      [CommunityBadgeRole.member]: community?.memberBadge,
    }),
    [community],
  );

  const [transferOpen, setTransferOpen] = useState(false);

  if (!isManager) {
    return null;
  }

  const badgeRoles = [
    CommunityBadgeRole.manager,
    CommunityBadgeRole.assistant,
    CommunityBadgeRole.member,
  ];

  return (
    <Stack spacing={6}>
      {/* General */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          General Information
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", sm: "center" }}
          sx={{
            p: 2,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          {/* Logo */}
          <Avatar
            src={community?.imageUrl ?? "/images/community.png"}
            alt={community?.name ?? "Community Logo"}
            sx={{ width: 72, height: 72, flexShrink: 0 }}
            slotProps={{
              img: {
                onError: (e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/images/community.png";
                },
              },
            }}
          >
            {!community?.imageUrl && community?.name
              ? community.name.charAt(0).toUpperCase()
              : undefined}
          </Avatar>

          {/* Info */}
          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="textPrimary">
                Community Name:
              </Typography>
              <Typography variant="body1" fontWeight={700} noWrap>
                {community?.name ?? "—"}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="textPrimary">
                Description:
              </Typography>
              <Typography variant="body1" fontWeight={700} noWrap>
                {community?.description ? community.description : "—"}
              </Typography>
            </Stack>
          </Stack>

          {/* Edit action */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<EditIcon />}
            aria-label="Edit community info"
            sx={{ flexShrink: 0 }}
            onClick={() => setEditInfoOpen(true)}
          >
            Edit Info
          </Button>
        </Stack>
      </Stack>

      {/* Badge Modifications */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          Badge Modifications
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={3}
          flexWrap="wrap"
          useFlexGap
        >
          {badgeRoles.map((badgeRole) => (
            <BadgeSettingsCard
              key={badgeRole}
              label={BADGE_ROLE_LABELS[badgeRole]}
              badge={badges[badgeRole]}
              onEdit={() => setEditBadgeOpen(badgeRole)}
            />
          ))}
        </Stack>
      </Stack>

      {/* Danger zone */}
      <Alert
        severity="error"
        icon={<ReportProblemOutlinedIcon />}
        sx={{
          p: 4,
          border: (theme) => `1px solid ${theme.palette.error.dark}`,
        }}
        action={
          <Button
            variant="outlined"
            color="error"
            size="small"
            aria-label="Transfer community ownership"
            sx={{ flexShrink: 0 }}
            onClick={() => setTransferOpen(true)}
          >
            Transfer Ownership
          </Button>
        }
      >
        <AlertTitle color="error">Danger Zone</AlertTitle>
      </Alert>

      <EditCommunityInfoDialog
        open={editInfoOpen}
        onClose={() => setEditInfoOpen(false)}
      />

      <EditBadgeDialog
        open={editBadgeOpen !== null}
        onClose={() => setEditBadgeOpen(null)}
        title={editBadgeOpen ? `Edit ${BADGE_ROLE_LABELS[editBadgeOpen]}` : ""}
        badgeId={editBadgeOpen ? badges[editBadgeOpen]?.id : undefined}
        badgeRole={editBadgeOpen ?? CommunityBadgeRole.member}
      />

      <TransferOwnershipDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
      />
    </Stack>
  );
}
