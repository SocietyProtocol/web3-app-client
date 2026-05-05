"use client";
import { Box, Button, Typography } from "@mui/material";
import { ReactNode, useCallback, useMemo } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";

export interface PageProps {
  defaultBackPath?: string;
  backButton?: boolean;
  title?: string;
  children: ReactNode;
  wideMargin?: boolean;
  rightAction?: ReactNode;
}

export const Page = ({
  defaultBackPath,
  backButton,
  title,
  children,
  wideMargin,
  rightAction,
}: PageProps) => {
  const router = useRouter();

  const hasBack = useMemo(() => {
    return (
      (typeof window !== "undefined" && window.history.length > 1) ||
      !!defaultBackPath
    );
  }, [defaultBackPath]);

  const handleBack = useCallback(() => {
    if (
      typeof window === "undefined" ||
      window.history.length > 1 ||
      !defaultBackPath
    ) {
      router.back();
    } else {
      router.push(defaultBackPath);
    }
  }, [defaultBackPath, router]);

  return (
    <Box sx={{ overflow: "clip" }}>
      {backButton && (
        <Box
          sx={{
            pl: { xs: 3, md: 6 },
            pt: { xs: 5, md: 7 },
            mb: wideMargin ? { xs: 1, md: -6 } : 0,
          }}
        >
          <Button
            disabled={!hasBack}
            variant="link"
            onClick={handleBack}
            aria-label="Go back"
            startIcon={
              <ArrowBackIcon
                sx={{
                  fontSize: {
                    xs: (theme) => theme.typography.pxToRem(20),
                    sm: (theme) => theme.typography.pxToRem(16),
                  },
                }}
              />
            }
          >
            <Box
              component="span"
              sx={{ display: { xs: "none", sm: "inline" } }}
            >
              Back
            </Box>
          </Button>
        </Box>
      )}
      <Box
        sx={{
          paddingX: wideMargin ? { xs: 3, md: 19 } : { xs: 3, md: 6 },
          paddingTop: backButton
            ? 2
            : wideMargin
              ? { xs: 5, md: 12 }
              : { xs: 5, md: 7 },
          paddingBottom: wideMargin ? { xs: 5, md: 12 } : { xs: 5, md: 7 },
          overflow: "clip",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: title ? 4 : wideMargin && !backButton ? -8 : 0,
            position: "relative",
          }}
        >
          {title && (
            <Typography
              variant="h4"
              component="h1"
              color="primary.main"
              sx={{
                mb: 6,
              }}
            >
              {title}
            </Typography>
          )}
          {rightAction}
        </Box>

        {children}
      </Box>
    </Box>
  );
};
