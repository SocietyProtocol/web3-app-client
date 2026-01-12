"use client";

import { Box, Chip } from "@mui/material";
import { AuctionStatusEnum, AuctionStatusProps } from "./types";

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

export const AuctionStatus = ({
  status,
  size = "small",
}: AuctionStatusProps) => {
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
