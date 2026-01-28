import { SxProps } from "@mui/material";
import { useProfile } from "../AccountSetup/useProfile";
import { isAddress } from "viem";
import { UserAvatar } from "./UserAvatar";

export interface AvatarProps {
  address?: string;
  ensImage?: string | null;
  size?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  sx?: SxProps;
  loading?: boolean;
}

export const Avatar = ({
  address,
  ensImage,
  size = 40,
  sx,
  loading,
}: AvatarProps) => {
  const {
    profileData: { data: profileData },
  } = useProfile(address && isAddress(address) ? address : undefined);

  const image = profileData?.imageUrl || ensImage;

  return (
    <UserAvatar
      address={address}
      imageUrl={image}
      size={size}
      sx={sx}
      loading={loading}
    />
  );
};
