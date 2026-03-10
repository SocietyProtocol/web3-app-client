import { Skeleton, Stack, Typography } from "@mui/material";
import { Avatar } from "../Avatar/Avatar";
import { OptionalLink } from "../OptionalLink/OptionalLink";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { isEqualCaseInsensitive } from "@/utils/string";
import { UserTagProps } from "./types";
import { UserCardPaper } from "./components";

export const UserTag = ({
  imageUrl,
  name,
  id,
  bio,
  loading = false,
  link = true,
  highlightYou,
}: UserTagProps) => {
  const { address: connectedAddress } = useAccount();

  const isConnectedUser = useMemo(
    () =>
      !!id &&
      !!connectedAddress &&
      isEqualCaseInsensitive(id, connectedAddress),
    [id, connectedAddress],
  );

  const url = useMemo(() => {
    if (!link) return false;

    if (isConnectedUser) {
      return `/profile`;
    }

    return id ? `/user/${id.toLowerCase()}` : false;
  }, [isConnectedUser, id, link]);

  return (
    <OptionalLink
      href={url}
      style={{
        textDecoration: "none",
        flex: 0,
        display: "block",
        minWidth: 214,
        maxWidth: 280,
      }}
    >
      <UserCardPaper
        highlight={highlightYou && isConnectedUser}
        elevation={1}
        size="small"
        sx={{
          px: 2,
          py: 1,
          width: "100%",
          minHeight: 74,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{
            overflow: "hidden",
          }}
        >
          {/* Avatar and Name Section */}

          <Avatar
            ensImage={imageUrl}
            address={id}
            size={42}
            loading={loading}
          />

          <Stack
            spacing={0.5}
            sx={{
              overflow: "hidden",
            }}
          >
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
                title={name ?? undefined}
              >
                {name}
              </Typography>
            )}

            <Typography
              variant="body2"
              sx={{
                whiteSpace: "nowrap",
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
      </UserCardPaper>
    </OptionalLink>
  );
};
