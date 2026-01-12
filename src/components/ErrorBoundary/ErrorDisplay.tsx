import { Box, Paper, Stack, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { ValidationError } from "@/errors/ValidationError";

export interface ErrorDisplayProps {
  error?: unknown;
  action?: React.ReactNode;
}

export const ErrorDisplay = ({ error, action }: ErrorDisplayProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: { xs: 300, sm: 400 },
        p: { xs: 2, sm: 3 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          maxWidth: 600,
          width: "100%",
          textAlign: "center",
          borderRadius: 2,
          backgroundColor: "background.default",
        }}
      >
        <Stack spacing={5} alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <ErrorOutlineIcon
              sx={{
                fontSize: { xs: 32, sm: 32 },
                color: "error.main",
              }}
            />

            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "error.main" }}
            >
              {error instanceof ValidationError
                ? "Validation Error"
                : "Something went wrong"}
            </Typography>
          </Stack>

          <Typography variant="body1" color="text.primary">
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred. Please try again."}
          </Typography>

          {error instanceof ValidationError && error.details && (
            <Box sx={{ width: "100%", textAlign: "left" }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Details:
              </Typography>
              <Stack spacing={1}>
                {Object.entries(error.details).map(([field, messages]) => (
                  <Box key={field}>
                    <Typography
                      variant="body2"
                      color="error"
                      sx={{ fontWeight: 500 }}
                    >
                      {field}:
                    </Typography>
                    {messages.map((msg, idx) => (
                      <Typography
                        key={idx}
                        variant="body2"
                        color="primary"
                        sx={{ ml: 2 }}
                      >
                        • {msg}
                      </Typography>
                    ))}
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {action && <Box sx={{ mt: 2 }}>{action}</Box>}
        </Stack>
      </Paper>
    </Box>
  );
};
