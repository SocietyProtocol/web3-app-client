"use client";

import { Badge, Box, Chip } from "@mui/material";
import { AuctionStatusEnum, AuctionStatusProps } from "./types";
import { useAuctionStatus } from "@/data/auction/useAuctionStatus";

export const mapStatusToColor = (status: AuctionStatusEnum) => {
  switch (status) {
    case AuctionStatusEnum.ACTIVE:
      return "success";
    case AuctionStatusEnum.INACTIVE:
      return "warning";
    case AuctionStatusEnum.ENDED:
    default:
      return "info";
  }
};

export const AuctionStatusDisk = ({
  size = "small",
}: Pick<AuctionStatusProps, "size">) => {
  return (
    <Box
      sx={{
        width: size === "small" ? 8 : 10,
        height: size === "small" ? 8 : 10,
        borderRadius: "50%",
        backgroundColor: "currentColor",
      }}
    />
  );
};

export const AuctionStatusDot = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { status, isLoading } = useAuctionStatus();

  if (isLoading) {
    return <>{children}</>;
  }
  return (
    <Badge
      color={mapStatusToColor(status)}
      variant="dot"
      overlap="circular"
      anchorOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      sx={{
        "& .MuiBadge-badge": {
          top: 12,
          left: 24,
          borderRadius: "50%",
          opacity: 0.85,
        },
      }}
    >
      {children}
    </Badge>
  );
};

export const AuctionStatus = ({ size = "small" }: AuctionStatusProps) => {
  const { status, isLoading } = useAuctionStatus();

  if (isLoading) {
    return null;
  }

  return (
    <Chip
      color={mapStatusToColor(status)}
      size={size}
      label={
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: size === "small" ? 0.5 : 1,
          }}
        >
          <AuctionStatusDisk size={size} />
          {status}
        </Box>
      }
      sx={{
        height: size === "small" ? 20 : 24,
        fontSize: "0.75rem",
        padding: ({ spacing }) => spacing(size === "small" ? 0.5 : 1),
        "& .MuiChip-label": {
          padding: 0,
        },
      }}
    />
  );
};
