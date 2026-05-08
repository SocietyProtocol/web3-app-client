import { Box, Typography } from "@mui/material";
import { BadgeCard } from "../BadgeCard";
import { useAccount } from "wagmi";

interface BadgePreviewProps {
  name?: string;
  imageUrl?: string | null;
  isOfficial?: boolean;
  isCommunity?: boolean;
}

export const BadgePreview = ({
  name,
  imageUrl,
  isOfficial,
  isCommunity,
}: BadgePreviewProps) => {
  const { address } = useAccount();

  return (
    <Box>
      <Typography variant="h6" mb={2}>
        Preview
      </Typography>

      <BadgeCard
        id="(Preview)"
        name={name || "Untitled Badge"}
        imageUrl={imageUrl || undefined}
        isOfficial={isOfficial}
        isCommunity={isCommunity}
        creatorAddress={address}
        readonly
      />
    </Box>
  );
};
