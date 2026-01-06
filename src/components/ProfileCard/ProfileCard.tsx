import { Paper, Skeleton, Stack, Typography } from "@mui/material";
import { Avatar } from "../Avatar/Avatar";
import { Hex } from "viem";
import { Address } from "../Address/Address";

interface ProfileCardProps {
  avatar?: string | null;
  name: string | undefined;
  address?: Hex;
  bio?: string;
  children?: React.ReactNode;
  showAddress?: boolean;
  readonly?: boolean;
}

export const ProfileCard = ({
  avatar,
  name,
  address,
  bio,
  children,
  showAddress = false,
  readonly = false,
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

        {address ? (
          <Avatar ensImage={avatar} address={address} size={54} />
        ) : (
          <Skeleton variant="circular" width={54} height={54} />
        )}

        {/* Name */}
        {name ? (
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
        ) : (
          <Skeleton width={100} />
        )}

        {/* Address */}
        {showAddress && address && (
          <Address
            address={address}
            showCopy={!readonly}
            showLink={!readonly}
            truncate
            size="small"
          />
        )}

        <Typography
          variant="body2"
          sx={{
            whiteSpace: "pre-wrap",
            px: 1,
            color: "text.primary",
            opacity: 0.6,
          }}
        >
          {bio}
        </Typography>

        {children}
      </Stack>
    </Paper>
  );
};
