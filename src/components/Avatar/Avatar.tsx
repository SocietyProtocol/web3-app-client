import { Avatar as MUIAvatar } from "@mui/material";
import { useMemo } from "react";

export interface AvatarProps {
  address: string;
  ensImage?: string | null;
  size: number;
}

const generateColorsFromAddress = (address: string): [string, string] => {
  // Simple hash function to generate deterministic colors from address
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate first color
  const hue1 = Math.abs(hash % 360);
  const saturation1 = 65 + (Math.abs(hash) % 20);
  const lightness1 = 55 + (Math.abs(hash >> 8) % 15);

  // Generate second color (offset hue for nice gradient)
  const hue2 = (hue1 + 40 + (Math.abs(hash >> 16) % 80)) % 360;
  const saturation2 = 65 + (Math.abs(hash >> 12) % 20);
  const lightness2 = 45 + (Math.abs(hash >> 4) % 15);

  return [
    `hsl(${hue1}, ${saturation1}%, ${lightness1}%)`,
    `hsl(${hue2}, ${saturation2}%, ${lightness2}%)`,
  ];
};

export const Avatar = ({ address, ensImage, size }: AvatarProps) => {
  const colors = useMemo(
    () => (!ensImage ? generateColorsFromAddress(address) : []),
    [address, ensImage]
  );

  return (
    <MUIAvatar
      {...(ensImage && { src: ensImage })}
      sx={{
        width: size,
        height: size,
        ...(!ensImage && {
          background: `linear-gradient(180deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        }),

        "& .MuiAvatar-fallback": {
          display: "none",
        },
      }}
    />
  );
};
