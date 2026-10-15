import { Box, Typography } from "@mui/material";
import { BadgeCard } from "../BadgeCard";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";

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
  const { address } = useOutpostAccount();

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
