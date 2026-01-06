import { Stack, Typography } from "@mui/material";
import { Hex } from "viem";
import { Avatar } from "../Avatar/Avatar";
import { useProfile } from "../AccountSetup/useProfile";
import { ProfileCard } from "../ProfileCard/ProfileCard";
import { PreviewPopover } from "../PreviewPopover/PreviewPopover";
import { OptionalLink } from "../OptionalLink/OptionalLink";

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
  const {
    profileId: { data: profileId },
    profileData: { data: profileData },
  } = useProfile(address);

  return (
    <PreviewPopover
      content={
        previewCard ? (
          <ProfileCard
            address={address}
            avatar={profileData?.avatar || null}
            name={profileData?.name || `User #${profileId}`}
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
          <Avatar address={address} size={24} ensImage={profileData?.avatar} />

          <Typography
            component="span"
            sx={{
              fontWeight: 800,
              fontSize: (theme) => theme.typography.pxToRem(12),
            }}
          >
            {profileData?.name || `User #${profileId}`}
          </Typography>
        </Stack>
      </OptionalLink>
    </PreviewPopover>
  );
};
