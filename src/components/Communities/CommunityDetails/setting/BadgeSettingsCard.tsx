import { BadgeCard } from "@/components/Badges/BadgeCard";
import { useBadgeMetadata } from "@/hooks/useBadgeMetadata";
import { Button, Stack, Typography } from "@mui/material";
import { MetadataBlock } from "../../CommunityCreation/MetadataBlock";
import EditIcon from "@mui/icons-material/Edit";
import { Badge } from "../../../../../.graphclient";

interface BadgeSettingsCardProps {
  label: string;
  badge: Pick<Badge, "id" | "name" | "imageUrl" | "uri"> | null | undefined;
  onEdit: () => void;
}

export function BadgeSettingsCard({
  label,
  badge,
  onEdit,
}: BadgeSettingsCardProps) {
  const { metadataString } = useBadgeMetadata(badge?.uri);

  return (
    <Stack spacing={1} sx={{ width: { xs: "100%", sm: 240 }, flexShrink: 0 }}>
      <Typography variant="body2" fontWeight={600}>
        {label}
      </Typography>

      <BadgeCard
        id={badge?.id ?? "(N/A)"}
        name={badge?.name ?? label}
        imageUrl={badge?.imageUrl ?? undefined}
        isCommunity
        readonly
      />

      <MetadataBlock label="METADATA" metadata={metadataString} />

      <Button
        variant="outlined"
        size="small"
        startIcon={<EditIcon />}
        aria-label={`Edit ${label.toLowerCase()}`}
        disabled={!badge?.id}
        fullWidth
        sx={{ whiteSpace: "nowrap" }}
        onClick={onEdit}
      >
        Edit
      </Button>
    </Stack>
  );
}
