import { Typography } from "@mui/material";

interface PlaceholderTabProps {
  label: string;
}

export function PlaceholderTab({ label }: PlaceholderTabProps) {
  return (
    <Typography variant="body2" color="text.secondary">
      {label} — coming soon.
    </Typography>
  );
}
