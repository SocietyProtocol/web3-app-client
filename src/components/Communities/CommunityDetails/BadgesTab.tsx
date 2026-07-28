"use client";

import { Box, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useCommunityDetailsContext } from "./CommunityDetails.context";
import { CommunityBadge } from "./CommunityBadge";
import { ButtonLink } from "@/components/ButtonLink";

export function BadgesTab() {
  const { community, isLoading, isManager, id } = useCommunityDetailsContext();

  const badges = community?.badges ?? [];

  return (
    <Box pt={2}>
      {isManager && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
          <ButtonLink
            href={`/communities/${id}/create-badge`}
            variant="outlined"
            startIcon={<AddIcon />}
            size="small"
          >
            Create Badge
          </ButtonLink>
        </Stack>
      )}

      {!isLoading && badges.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 200,
          }}
        >
          <Typography variant="body1" color="text.primary">
            No badges found
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
            gap: 2,
            width: "100%",
          }}
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <CommunityBadge key={`skeleton-${index}`} loading />
              ))
            : badges.map((badge) => (
                <CommunityBadge
                  key={badge.id}
                  id={badge.id}
                  name={badge.name}
                  imageUrl={badge.imageUrl}
                  isOfficial={badge.isOfficial}
                  holdersCount={badge.holdersCount}
                />
              ))}
        </Box>
      )}
    </Box>
  );
}
