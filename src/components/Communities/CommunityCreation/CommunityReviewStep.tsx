import { Paper, Stack, Typography } from "@mui/material";
import { useWatch } from "react-hook-form";
import { useCommunityCreation } from "./CommunityCreationContext";
import { CommunityCard } from "../CommunityCard";
import { BadgeCard } from "@/components/Badges/BadgeCard";
import { getManagerBadgeName, getMemberBadgeName } from "./badgeNames";

const formatMetadata = (value: string): string => {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch (err) {
    console.warn("CommunityReviewStep: failed to parse metadata JSON", err);
    return value;
  }
};

const MetadataBlock = ({
  label,
  metadata,
}: {
  label: string;
  metadata?: string;
}) => {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          borderRadius: 1,
          bgcolor: "background.default",
          fontFamily: "monospace",
          fontSize: 12,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
        component="pre"
      >
        {metadata ? formatMetadata(metadata) : "No additional metadata"}
      </Paper>
    </Stack>
  );
};

export const CommunityReviewStep = () => {
  const { form } = useCommunityCreation();

  const [
    name,
    description,
    creatorBadgeImageUrl,
    creatorBadgeMetadata,
    memberBadgeImageUrl,
    memberBadgeMetadata,
  ] = useWatch({
    control: form.control,
    name: [
      "name",
      "description",
      "creatorBadgeImageUrl",
      "creatorBadgeMetadata",
      "memberBadgeImageUrl",
      "memberBadgeMetadata",
    ],
  });

  return (
    <Stack spacing={3} maxWidth={{ sm: 632 }} mx="auto">
      <Typography variant="body1" color="text.secondary">
        Review your community details before submitting
      </Typography>

      <Stack spacing={1} minWidth={240} width={{ sm: 300 }}>
        <CommunityCard
          id="(Preview)"
          name={name}
          imageUrl={creatorBadgeImageUrl}
          readonly
        />
        <MetadataBlock label="DESCRIPTION" metadata={description} />
      </Stack>

      {/* Badges */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={4}
        justifyContent="flex-start"
      >
        <Stack spacing={1} minWidth={240} width={{ sm: 300 }}>
          <Typography variant="subtitle2">Manager Badge</Typography>
          <BadgeCard
            id="(Preview)"
            name={name ? getManagerBadgeName(name) : "Manager Badge"}
            imageUrl={creatorBadgeImageUrl ?? undefined}
            isCommunity
            readonly
          />
          <MetadataBlock label="METADATA" metadata={creatorBadgeMetadata} />
        </Stack>

        <Stack spacing={1} minWidth={240} width={{ sm: 300 }}>
          <Typography variant="subtitle2">Member Badge</Typography>
          <BadgeCard
            id="(Preview)"
            name={name ? getMemberBadgeName(name) : "Member Badge"}
            imageUrl={memberBadgeImageUrl ?? undefined}
            isCommunity
            readonly
          />
          <MetadataBlock label="METADATA" metadata={memberBadgeMetadata} />
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Submitting will upload metadata to IPFS and prompt you to sign a
        transaction to create the community on-chain.
      </Typography>
    </Stack>
  );
};
