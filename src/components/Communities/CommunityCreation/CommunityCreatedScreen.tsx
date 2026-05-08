import { Avatar, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

export interface CommunityCreatedScreenProps {
  communityId: bigint;
  communityName: string;
  communityImage: string | null;
}

export const CommunityCreatedScreen = ({
  communityId,
  communityName,
  communityImage,
}: CommunityCreatedScreenProps) => {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={3}
      sx={{ py: 8, px: 4, textAlign: "center" }}
    >
      <CheckCircleOutlineIcon sx={{ fontSize: 72, color: "success.main" }} />

      <Typography variant="h4" component="h2" color="primary.main">
        Community Created!
      </Typography>

      <Avatar
        src={communityImage ?? undefined}
        alt={communityName}
        sx={{ width: 80, height: 80 }}
      >
        {!communityImage && communityName
          ? communityName.charAt(0).toUpperCase()
          : undefined}
      </Avatar>

      <Typography variant="h6">{communityName}</Typography>

      <Typography variant="body1" color="text.secondary">
        Your community has been successfully created on-chain.
      </Typography>

      <Button
        component={Link}
        href={`/communities/${communityId.toString()}`}
        variant="contained"
        size="large"
        sx={{ mt: 1 }}
      >
        View Community
      </Button>
    </Stack>
  );
};
