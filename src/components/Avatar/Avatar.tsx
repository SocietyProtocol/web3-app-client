import { SxProps, Theme } from "@mui/material";
import { isAddress } from "viem";
import { UserAvatar } from "./UserAvatar";
import { useUserQuery } from "@/data/users/useUserQuery";
import { useMemo } from "react";

export interface AvatarProps {
  address?: string;
  ensImage?: string | null;
  size?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  sx?: SxProps<Theme>;
  loading?: boolean;
}

export const Avatar = ({
  address,
  ensImage,
  size = 40,
  sx,
  loading,
}: AvatarProps) => {
  const { data: user } = useUserQuery(
    useMemo(
      () => (address && isAddress(address) ? address : undefined),
      [address],
    ),
  );

  const image = user?.imageUrl || ensImage;

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
