import { Box, Typography } from "@mui/material";
import { useBadgeCreation } from "./BadgeCreationContext";
import { BadgeCard } from "../BadgeCard";
import { useAccount } from "wagmi";

export const BadgePreview = () => {
  const { address } = useAccount();
  const { form } = useBadgeCreation();
  const { watch } = form;

  const name = watch("name");
  const imageUrl = watch("imageUrl");
  const isOfficial = watch("isOfficial");
  const isCommunity = watch("isCommunity");

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
