"use client";

import React, { Component, ReactNode } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { ValidationError } from "@/errors/ValidationError";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Log validation errors with details
    if (error instanceof ValidationError) {
      console.error("Validation error details:", error.details);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default error UI
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
            elevation={1}
            sx={{
              p: { xs: 3, sm: 4 },
              maxWidth: 600,
              width: "100%",
              textAlign: "center",
            }}
          >
            <Stack spacing={3} alignItems="center">
              <ErrorOutlineIcon
                sx={{
                  fontSize: { xs: 48, sm: 64 },
                  color: "error.main",
                }}
              />

              <Typography
                variant="h5"
                sx={{ fontWeight: 600, color: "error.main" }}
              >
                {this.state.error instanceof ValidationError
                  ? "Validation Error"
                  : "Something went wrong"}
              </Typography>

              <Typography variant="body1" color="text.secondary">
                {this.state.error.message ||
                  "An unexpected error occurred. Please try again."}
              </Typography>

              {this.state.error instanceof ValidationError &&
                this.state.error.details && (
                  <Box sx={{ width: "100%", textAlign: "left" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Details:
                    </Typography>
                    <Stack spacing={1}>
                      {Object.entries(this.state.error.details).map(
                        ([field, messages]) => (
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
                                color="text.secondary"
                                sx={{ ml: 2 }}
                              >
                                • {msg}
                              </Typography>
                            ))}
                          </Box>
                        )
                      )}
                    </Stack>
                  </Box>
                )}

              <Button
                variant="contained"
                onClick={this.resetError}
                sx={{ mt: 2 }}
              >
                Try Again
              </Button>
            </Stack>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
