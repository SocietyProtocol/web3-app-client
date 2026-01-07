import { Skeleton, Stack, Typography } from "@mui/material";
import { Hex } from "viem";
import { Avatar } from "../Avatar/Avatar";
import { useProfile } from "../AccountSetup/useProfile";
import { ProfileCard } from "../ProfileCard/ProfileCard";
import { PreviewPopover } from "../PreviewPopover/PreviewPopover";
import { OptionalLink } from "../OptionalLink/OptionalLink";
import { useAccount } from "wagmi";

interface UserHandleProps {
  address: Hex;
  previewCard?: boolean;
  link?: boolean;
}

export const UserHandle = ({
  address,
  previewCard = false,
  link = false,
}: UserHandleProps) => {
  const { address: connectedAddress } = useAccount();
  const {
    username,
    profileId: { isLoading: profileIdLoading },
    uri: { isLoading: uriLoading },
    profileData: { data: profileData, isLoading: profileDataLoading },
  } = useProfile(address);

  return (
    <PreviewPopover
      content={
        previewCard ? (
          <ProfileCard
            loading={profileIdLoading || uriLoading || profileDataLoading}
            address={address}
            avatar={profileData?.avatar}
            name={username}
            bio={profileData?.bio}
            showAddress
            readonly
          />
        ) : undefined
      }
    >
      <OptionalLink
        href={link && `/user/${address.toLowerCase()}`}
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
          spacing={1}
          sx={{
            width: "fit-content",
            flex: 0,
          }}
        >
          <Avatar
            address={address}
            size={24}
            ensImage={profileData?.avatar}
            loading={profileIdLoading || uriLoading || profileDataLoading}
          />

          <Typography
            component="span"
            sx={{
              fontWeight: 800,
              fontSize: (theme) => theme.typography.pxToRem(12),
            }}
          >
            {profileIdLoading || uriLoading || profileDataLoading ? (
              <Skeleton width={50} />
            ) : (
              `${username ?? "Unknown User"}`
            )}
          </Typography>

          {!profileIdLoading &&
            !uriLoading &&
            !profileDataLoading &&
            connectedAddress?.toLowerCase() === address.toLowerCase() && (
              <Typography
                component="span"
                sx={{
                  fontWeight: 500,
                  fontSize: (theme) => theme.typography.pxToRem(10),
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
