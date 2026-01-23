import { Box, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import { User } from "../../../.graphclient";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import { UserHandle } from "../UserHandle/UserHandle";
import { Address } from "viem";

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
      <Typography
        variant="body1"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontWeight: 700,
          color: "text.primary",
          fontSize: (theme) => theme.typography.pxToRem(16),
        }}
      >
        <Tooltip title={tooltip} arrow placement="top">
          <InfoOutlineIcon sx={{ cursor: "help", fontSize: 16 }} />
        </Tooltip>
        {label}
      </Typography>
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
