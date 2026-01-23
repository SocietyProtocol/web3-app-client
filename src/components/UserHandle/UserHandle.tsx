import { Skeleton, Stack, Typography } from "@mui/material";
import { Avatar } from "../Avatar/Avatar";
import { useProfile } from "../AccountSetup/useProfile";
import { ProfileCard } from "../ProfileCard/ProfileCard";
import { PreviewPopover } from "../PreviewPopover/PreviewPopover";
import { OptionalLink } from "../OptionalLink/OptionalLink";
import { useAccount } from "wagmi";
import { Address } from "viem";
import { truncateAddress } from "@/utils/string";
import { useMemo } from "react";

interface UserHandleProps {
  address: Address;
  previewCard?: boolean;
  link?: boolean;
  showYouLabel?: boolean;
  size?: "small" | "medium";
}

export const UserHandle = ({
  address,
  previewCard = false,
  link = false,
  showYouLabel = true,
  size = "medium",
}: UserHandleProps) => {
  const { address: connectedAddress } = useAccount();
  const {
    username,
    profileId: { isLoading: profileIdLoading },
    uri: { isLoading: uriLoading },
    profileData: { data: profileData, isLoading: profileDataLoading },
  } = useProfile(address);

  const url = useMemo(() => {
    if (address.toLowerCase() === connectedAddress?.toLowerCase()) {
      return link ? `/profile` : false;
    }
    return link ? `/user/${address.toLowerCase()}` : false;
  }, [address, connectedAddress, link]);

  return (
    <PreviewPopover
      content={
        previewCard ? (
          <ProfileCard
            loading={profileIdLoading || uriLoading || profileDataLoading}
            address={address}
            imageUrl={profileData?.imageUrl}
            name={username}
            bio={profileData?.bio}
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
          <Avatar
            address={address}
            size={size === "small" ? 16 : 24}
            ensImage={profileData?.imageUrl}
            loading={profileIdLoading || uriLoading || profileDataLoading}
          />

          <Typography
            component="span"
            sx={{
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: size === "small" ? 80 : 150,
              fontWeight: 800,
              fontSize: (theme) =>
                theme.typography.pxToRem(size === "small" ? 10 : 12),
            }}
          >
            {profileIdLoading || uriLoading || profileDataLoading ? (
              <Skeleton width={50} />
            ) : (
              `${username ?? truncateAddress(address)}`
            )}
          </Typography>

          {!profileIdLoading &&
            !uriLoading &&
            !profileDataLoading &&
            showYouLabel &&
            connectedAddress?.toLowerCase() === address.toLowerCase() && (
              <Typography
                component="span"
                sx={{
                  fontWeight: 500,
                  fontSize: (theme) =>
                    theme.typography.pxToRem(size === "small" ? 10 : 12),
                  color: "info.main",
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
