import { SxProps, Theme } from "@mui/material";
import { UserAvatar } from "./UserAvatar";
import { useUserQuery } from "@/data/users/useUserQuery";
import { useMemo } from "react";
import { avatarLookupAddress } from "./avatarLookup";

export interface AvatarProps {
  address?: string;
  /** The user's image from the subgraph (null: none). Given, no User is looked up. */
  userImageUrl?: string | null;
  ensImage?: string | null;
  size?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  sx?: SxProps<Theme>;
  loading?: boolean;
}

export const Avatar = ({
  address,
  userImageUrl,
  ensImage,
  size = 40,
  sx,
  loading,
}: AvatarProps) => {
  const { data: user } = useUserQuery(
    useMemo(
      () => avatarLookupAddress(address, userImageUrl),
      [address, userImageUrl],
    ),
  );

  const image = userImageUrl || user?.imageUrl || ensImage;

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
