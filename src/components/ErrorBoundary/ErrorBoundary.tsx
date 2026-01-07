"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@mui/material";
import { ValidationError } from "@/errors/ValidationError";
import { ErrorDisplay } from "./ErrorDisplay";

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
        <ErrorDisplay
          error={this.state.error}
          action={
            <Button
              variant="contained"
              onClick={this.resetError}
              sx={{ mt: 2 }}
            >
              Try Again
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
