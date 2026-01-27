import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { User } from "../../../.graphclient";
import { UserHandle } from "../UserHandle/UserHandle";
import { Address } from "viem";
import { WithTooltip } from "../WithTooltip/WithTooltip";

interface BadgeManagersProps {
  label: string;
  tooltip: string;
  isLoading?: boolean;
  managers?: Array<Pick<User, "id" | "name" | "imageUrl">>;
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
                managers?.map(({ id }) => (
                  <UserHandle
                    key={id}
                    address={id as Address}
                    size="small"
                    previewCard
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
