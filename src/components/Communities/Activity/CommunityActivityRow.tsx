"use client";

import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { CommunityActivitiesQuery } from "../../../../.graphclient";
import { CommunityActivityDescription } from "./CommunityActivityDescription";
import { formatDateTime, formatRelativeTime } from "@/utils/date";
import { useExplorerLinkBuilder } from "@/hooks/useExplorerLinkBuilder";
import { Hex } from "viem";

type ActivityEvent =
  CommunityActivitiesQuery["communityActivityEvents"][number];

interface CommunityActivityRowProps {
  event: ActivityEvent;
}

export function CommunityActivityRow({ event }: CommunityActivityRowProps) {
  const buildExplorerLink = useExplorerLinkBuilder();
  const txUrl = buildExplorerLink({ tx: event.txHash as Hex });

  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 1.5 }}>
      <Box sx={{ minWidth: 100 }}>
        <Tooltip title={formatDateTime(event.timestamp)} placement="top">
          <Typography
            variant="body2"
            color="text.primary"
            noWrap
            sx={{ cursor: "default", fontSize: 12 }}
          >
            {formatRelativeTime(event.timestamp)}
          </Typography>
        </Tooltip>
      </Box>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <CommunityActivityDescription event={event} />
        <Tooltip title="View transaction">
          <IconButton
            size="small"
            href={txUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View transaction on explorer"
            sx={{ color: "text.disabled" }}
          >
            <OpenInNewIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
