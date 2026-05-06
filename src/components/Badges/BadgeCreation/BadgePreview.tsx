import { Box, Typography } from "@mui/material";
import { useBadgeCreation } from "./BadgeCreationContext";
import { BadgeCard } from "../BadgeCard";
import { useAccount } from "wagmi";
import { useWatch } from "react-hook-form";

interface BadgePreviewProps {
  isCommunity?: boolean;
}

export const BadgePreview = ({ isCommunity }: BadgePreviewProps) => {
  const { address } = useAccount();
  const { form } = useBadgeCreation();

  const [name, imageUrl, isOfficial] = useWatch({
    control: form.control,
    name: ["name", "imageUrl", "isOfficial"],
  });

  return (
    <Box
      sx={{
        position: "sticky",
        top: 24,
      }}
    >
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
        uri={"#"}
      />
    </Box>
  );
};
