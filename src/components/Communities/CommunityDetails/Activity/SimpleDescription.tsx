import { Typography } from "@mui/material";

interface SimpleDescriptionProps {
  label: string;
}

export function SimpleDescription({ label }: SimpleDescriptionProps) {
  return (
    <Typography
      variant="body2"
      color="text.primary"
      component="span"
      sx={{ fontSize: 12 }}
    >
      {label}
    </Typography>
  );
}
