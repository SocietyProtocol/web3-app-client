"use client";
import { Box, Link, Typography } from "@mui/material";
import { ReactNode, useCallback } from "react";
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

  const handleBack = useCallback(() => {
    if (window.history.length > 1 || !defaultBackPath) {
      router.back();
    } else {
      router.push(defaultBackPath);
    }
  }, [defaultBackPath, router]);

  return (
    <Box
      sx={{
        paddingX: wideMargin ? { xs: 2, md: 19 } : { xs: 3, md: 6 },
        paddingY: wideMargin ? { xs: 5, md: 12 } : { xs: 5, md: 7 },
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: title ? 4 : wideMargin ? -8 : 0,
          position: "relative",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 2,
            position: "relative",
          }}
        >
          {backButton && (
            <Link
              component="button"
              onClick={handleBack}
              aria-label="Go back"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: "primary.main",
                fontSize: { xs: "0.875rem", sm: "1rem" },
                fontWeight: 600,
                textDecoration: "none",
                position: "relative",
                zIndex: 1,
                "&:hover": { textDecoration: "underline" },
              }}
            >
              <ArrowBackIcon sx={{ fontSize: "14px" }} />
              <Box
                component="span"
                sx={{ display: { xs: "none", sm: "inline" } }}
              >
                Back
              </Box>
            </Link>
          )}
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
        </Box>

        {rightAction}
      </Box>

      {children}
    </Box>
  );
};
