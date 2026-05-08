import { Box, Typography } from "@mui/material";
import { CommunityCard } from "../CommunityCard";

export interface CommunityPreviewProps {
  name: string;
  imageUrl?: string | null;
}

export const CommunityPreview = ({ name, imageUrl }: CommunityPreviewProps) => {
  return (
    <Box>
      <Typography variant="h6" mb={2}>
        Preview
      </Typography>

      <CommunityCard
        id="(Preview)"
        name={name || "Untitled Community"}
        imageUrl={imageUrl ?? undefined}
        memberCount={0}
        readonly
      />
    </Box>
  );
};
