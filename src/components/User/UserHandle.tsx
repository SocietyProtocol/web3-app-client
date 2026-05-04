import { Skeleton, Stack, Typography } from "@mui/material";
import { UserCard } from "./UserCard";
import { PreviewPopover } from "../PreviewPopover/PreviewPopover";
import { OptionalLink } from "../OptionalLink/OptionalLink";
import { useAccount } from "wagmi";
import { isEqualCaseInsensitive, truncateAddress } from "@/utils/string";
import { useMemo } from "react";
import { UserHandleProps } from "./types";
import { Hex } from "viem";
import { UserAvatar } from "../Avatar/UserAvatar";

export const UserHandle = ({
  id,
  name,
  bio,
  imageUrl,
  showPreview = false,
  link = false,
  highlightYou = false,
  size = "medium",
  loading,
  fullAddress = false,
}: UserHandleProps) => {
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
    <PreviewPopover
      content={
        showPreview ? (
          <UserCard
            loading={loading}
            id={id}
            imageUrl={imageUrl}
            name={name ?? (id && truncateAddress(id as Hex))}
            bio={bio}
            showAddress
            readonly
          />
        ) : undefined
      }
    >
      <OptionalLink
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          textDecoration: "none",
          width: "fit-content",
          flex: 0,
        }}
        aria-label={
          !loading && (name ?? id)
            ? `User profile link for ${name ?? id}`
            : undefined
        }
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={size === "small" ? 0.5 : 1}
          sx={{
            width: "fit-content",
            flex: 0,
          }}
        >
          <UserAvatar
            address={id}
            size={size === "small" ? 16 : 24}
            imageUrl={imageUrl}
            loading={loading}
          />

          <Typography
            component="span"
            sx={{
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: size === "small" ? 80 : 400,
              fontWeight: 800,
              fontSize: (theme) =>
                theme.typography.pxToRem(size === "small" ? 10 : 12),
            }}
          >
            {loading ? (
              <Skeleton width={50} />
            ) : (
              `${name ?? (fullAddress ? id : truncateAddress(id as Hex, size === "small" ? 4 : 6))}`
            )}
          </Typography>

          {!loading && isConnectedUser && id && highlightYou && (
            <Typography
              component="span"
              sx={{
                fontWeight: 500,
                fontSize: (theme) =>
                  theme.typography.pxToRem(size === "small" ? 10 : 12),
                color: "success.contrastText",
              }}
            >
              (You)
            </Typography>
          )}
        </Stack>
      </OptionalLink>
    </PreviewPopover>
  );
};
