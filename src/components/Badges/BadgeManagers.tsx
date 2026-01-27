import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { Hex } from "viem";
import { WithTooltip } from "../WithTooltip/WithTooltip";
import { UserHandle } from "../User/UserHandle";
import { BadgeData } from "@/data/badges/types";

interface BadgeManagersProps {
  label: string;
  tooltip: string;
  isLoading?: boolean;
  managers?: BadgeData["managers"];
}

export const BadgeManagers = ({
  label,
  tooltip,
  isLoading = false,
  managers,
}: BadgeManagersProps) => {
  return (
    <Stack spacing={1} padding={1} alignItems="flex-start">
      <WithTooltip
        variant="body1"
        sx={{
          fontWeight: 700,
          color: "text.primary",
          fontSize: (theme) => theme.typography.pxToRem(16),
        }}
        tooltip={tooltip}
      >
        {label}
      </WithTooltip>
      <Stack direction="row" spacing={1} alignItems="center" paddingLeft={1.5}>
        {managers?.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.primary",
              whiteSpace: "nowrap",
            }}
          >
            No one
          </Typography>
        ) : (
          <>
            <Typography
              variant="body2"
              sx={{
                color: "text.primary",
                whiteSpace: "nowrap",
              }}
            >
              Managers:
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 1,
                rowGap: 1,
                flexWrap: "wrap",
              }}
            >
              {isLoading ? (
                <Skeleton width={100} height={20} />
              ) : (
                managers?.map(({ id, name, imageUrl, bio }) => (
                  <UserHandle
                    key={id}
                    id={id as Hex}
                    name={name}
                    bio={bio}
                    imageUrl={imageUrl}
                    size="small"
                    highlightYou
                    showPreview
                    link
                  />
                ))
              )}
            </Box>
          </>
        )}
      </Stack>
    </Stack>
  );
};
