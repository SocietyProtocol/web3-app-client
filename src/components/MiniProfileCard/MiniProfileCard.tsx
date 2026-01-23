import { Paper, Skeleton, Stack, Typography } from "@mui/material";
import { Avatar } from "../Avatar/Avatar";
import { Address } from "viem";
import { OptionalLink } from "../OptionalLink/OptionalLink";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { isEqualCaseInsensitive } from "@/utils/string";

interface MiniProfileCardProps {
  imageUrl?: string | null;
  username?: string;
  address?: Address;
  bio?: string;
  loading?: boolean;
  link?: boolean;
}

export const MiniProfileCard = ({
  imageUrl,
  username,
  address,
  bio,
  loading = false,
  link = true,
}: MiniProfileCardProps) => {
  const { address: connectedAddress } = useAccount();

  const url = useMemo(() => {
    if (
      address &&
      connectedAddress &&
      isEqualCaseInsensitive(address, connectedAddress)
    ) {
      return link ? `/profile` : false;
    }

    return address && link ? `/user/${address.toLowerCase()}` : false;
  }, [address, connectedAddress, link]);

  return (
    <OptionalLink
      href={url}
      style={{
        textDecoration: "none",
        width: "fit-content",
        flex: 0,
      }}
    >
      <Paper
        elevation={1}
        sx={{
          px: 1,
          py: 1,
          borderRadius: 2,
          boxShadow: "none",
          width: 214,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Avatar and Name Section */}

          <Avatar
            ensImage={imageUrl}
            address={address}
            size={42}
            loading={loading}
          />

          <Stack spacing={0.5}>
            {/* Name */}
            {loading ? (
              <Skeleton width={100} />
            ) : (
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}
                title={username}
              >
                {username}
              </Typography>
            )}

            <Typography
              variant="body2"
              sx={{
                whiteSpace: "pre-wrap",
                color: "text.primary",
                opacity: 0.6,
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: (theme) => theme.typography.pxToRem(12),
              }}
            >
              {loading ? <Skeleton variant="text" width={150} /> : bio}
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </OptionalLink>
  );
};
