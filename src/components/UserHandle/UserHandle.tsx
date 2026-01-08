import { Skeleton, Stack, Typography } from "@mui/material";
import { Avatar } from "../Avatar/Avatar";
import { useProfile } from "../AccountSetup/useProfile";
import { ProfileCard } from "../ProfileCard/ProfileCard";
import { PreviewPopover } from "../PreviewPopover/PreviewPopover";
import { OptionalLink } from "../OptionalLink/OptionalLink";
import { useAccount } from "wagmi";
import { Address } from "viem";
import { truncateAddress } from "@/utils/string";

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
          spacing={size === "small" ? 0.5 : 1}
          sx={{
            width: "fit-content",
            flex: 0,
          }}
        >
          <Avatar
            address={address}
            size={size === "small" ? 12 : 24}
            ensImage={profileData?.avatar}
            loading={profileIdLoading || uriLoading || profileDataLoading}
          />

          <Typography
            component="span"
            sx={{
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: size === "small" ? 50 : 150,
              fontWeight: 800,
              fontSize: (theme) =>
                theme.typography.pxToRem(size === "small" ? 8 : 12),
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
                    theme.typography.pxToRem(size === "small" ? 8 : 12),
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
