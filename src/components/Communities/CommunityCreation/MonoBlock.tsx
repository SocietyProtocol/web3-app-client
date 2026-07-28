import { Stack, Typography, Paper } from "@mui/material";

export interface MonoBlockProps {
  label: string;
  value?: string | null;
}

export const MonoBlock = ({ label, value }: MonoBlockProps) => {
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
        {value ?? "--"}
      </Paper>
    </Stack>
  );
};
