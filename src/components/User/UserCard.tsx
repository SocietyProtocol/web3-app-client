import { Skeleton, Stack, Typography } from "@mui/material";
import { AddressDisplay as AddressDisplay } from "../AddressDisplay/AddressDisplay";
import { UserCardProps } from "./types";
import { UserCardPaper } from "./components";
import { UserAvatar } from "../Avatar/UserAvatar";
import { OptionalLink } from "../OptionalLink/OptionalLink";
import { useAccount } from "wagmi";
import { useMemo } from "react";
import { isEqualCaseInsensitive } from "@/utils/string";
import { Hex } from "viem";

export const UserCard = ({
  imageUrl,
  name,
  id,
  bio,
  children,
  showAddress = false,
  readonly = false,
  loading = false,
  size = "large",
  highlightYou = false,
  link = false,
}: UserCardProps) => {
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
      aria-label={
        (name ?? id) ? `User profile link for ${name ?? id}` : undefined
      }
    >
      <UserCardPaper
        elevation={1}
        size={size}
        highlight={highlightYou && isConnectedUser}
      >
        <Stack spacing={size === "large" ? 2 : 1} alignItems="center">
          {/* Avatar and Name Section */}

          <UserAvatar
            imageUrl={imageUrl}
            address={id}
            size={size === "large" ? 54 : 36}
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

          {/* Address */}
          {showAddress &&
            (id && !loading ? (
              <AddressDisplay
                address={id as Hex}
                showCopy={!readonly && !link}
                showLink={!readonly && !link}
                truncate
                size="small"
              />
            ) : (
              <Skeleton variant="text" width={100} />
            ))}

          {size === "large" && (
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
          )}

          {children}
        </Stack>
      </UserCardPaper>
    </OptionalLink>
  );
};
