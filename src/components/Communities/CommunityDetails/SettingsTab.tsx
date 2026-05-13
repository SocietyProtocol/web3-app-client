"use client";

import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import { useState } from "react";
import { useCommunityDetailsContext } from "./CommunityDetails.context";
import { EditCommunityInfoDialog } from "./settings/EditCommunityInfoDialog";
import { EditManagerBadgeDialog } from "./settings/EditManagerBadgeDialog";
import { TransferOwnershipDialog } from "./settings/TransferOwnershipDialog";

export function SettingsTab() {
  const { community, isManager } = useCommunityDetailsContext();
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [editBadgeOpen, setEditBadgeOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  if (!isManager) {
    return null;
  }

  return (
    <Stack spacing={10}>
      {/* General */}
      <Box>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
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

          {/* Edit actions */}
          <Stack
            direction={{ xs: "row", sm: "column" }}
            spacing={2}
            sx={{ flexShrink: 0 }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              aria-label="Edit community info"
              onClick={() => setEditInfoOpen(true)}
            >
              Edit Info
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              aria-label="Edit manager badge metadata"
              onClick={() => setEditBadgeOpen(true)}
            >
              Edit Manager Badge
            </Button>
          </Stack>
        </Stack>
      </Box>

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
      <EditManagerBadgeDialog
        open={editBadgeOpen}
        onClose={() => setEditBadgeOpen(false)}
      />
      <TransferOwnershipDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
      />
    </Stack>
  );
}
