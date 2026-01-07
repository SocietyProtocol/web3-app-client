import { Paper, Skeleton, Stack, Typography } from "@mui/material";
import { Avatar } from "../Avatar/Avatar";
import { AddressDisplay as AddressDisplay } from "../AddressDisplay/AddressDisplay";
import { Address } from "viem";

interface ProfileCardProps {
  avatar?: string | null;
  name?: string;
  address?: Address;
  bio?: string;
  children?: React.ReactNode;
  showAddress?: boolean;
  readonly?: boolean;
  loading?: boolean;
}

export const ProfileCard = ({
  avatar,
  name,
  address,
  bio,
  children,
  showAddress = false,
  readonly = false,
  loading = false,
}: ProfileCardProps) => {
  return (
    <Paper
      elevation={1}
      sx={{
        px: 1,
        py: 2,
        borderRadius: 2,
        boxShadow: "none",
        minHeight: 220,
        width: {
          xs: "100%",
          sm: "214px",
        },
      }}
    >
      <Stack spacing={2} alignItems="center">
        {/* Avatar and Name Section */}

        <Avatar
          ensImage={avatar}
          address={address}
          size={54}
          loading={loading}
        />

        {/* Name */}
        {loading ? (
          <Skeleton width={100} />
        ) : (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: "text.primary",
              opacity: 0.8,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
            title={name}
          >
            {name}
          </Typography>
        )}

        {/* Address */}
        {showAddress &&
          (address && !loading ? (
            <AddressDisplay
              address={address}
              showCopy={!readonly}
              showLink={!readonly}
              truncate
              size="small"
            />
          ) : (
            <Skeleton variant="text" width={100} />
          ))}

        <Typography
          variant="body2"
          sx={{
            whiteSpace: "pre-wrap",
            px: 1,
            color: "text.primary",
            opacity: 0.6,
          }}
        >
          {loading ? <Skeleton variant="text" width={150} /> : bio}
        </Typography>

        {children}
      </Stack>
    </Paper>
  );
};
