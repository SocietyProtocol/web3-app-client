"use client";

import { Box, Stack, Typography } from "@mui/material";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import Image from "next/image";
import Link from "next/link";

const LEARN_MORE_URL =
  "https://societyprotocol.io/articles/how-we-are-building-society-protocol/";

export const WelcomeCard = () => {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: { xs: 320, md: 380 },
        borderRadius: { xs: 5, md: 6 },
        border: (theme) => `1px solid ${theme.palette.border.bubble}`,
        backgroundColor: "background.page",
        padding: { xs: 3, md: 5 },
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: { xs: 20, md: 28 },
          right: { xs: 20, md: 28 },
          width: { xs: 28, md: 36 },
          height: { xs: 28, md: 36 },
        }}
      >
        <Image
          src="/logo/logo-icon-dark.svg"
          alt="Society Protocol"
          fill
          style={{ objectFit: "contain" }}
        />
      </Box>

      <Typography
        variant="h4"
        component="h2"
        sx={{
          color: "primary.main",
          fontSize: { xs: "2rem", md: "2.5rem" },
          lineHeight: 1,
          mt: { xs: 2, md: 4 },
          mb: { xs: 3, md: 4 },
        }}
      >
        Welcome
      </Typography>

      <Stack spacing={1} sx={{ flexGrow: 1 }}>
        <Typography
          sx={{
            color: "text.tertiary",
            fontSize: { xs: "1rem", md: "1.0625rem" },
            lineHeight: 1.55,
          }}
        >
          We&apos;re building the coordination layer for a new kind of society.
        </Typography>
        <Typography
          sx={{
            color: "text.tertiary",
            fontSize: { xs: "1rem", md: "1.0625rem" },
            lineHeight: 1.55,
          }}
        >
          This is where your contribution gets recorded — verifiably,
          permanently, yours.
        </Typography>
      </Stack>

      <Box
        component={Link}
        href={LEARN_MORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          mt: { xs: 3, md: 4 },
          color: "primary.main",
          textDecoration: "none",
          fontFamily:
            "var(--font-pptelegraf), var(--font-space-grotesk), sans-serif",
          fontSize: { xs: "0.8125rem", md: "0.875rem" },
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          width: "fit-content",
          "&:hover": {
            opacity: 0.8,
          },
        }}
      >
        Learn about Society Protocol
        <NorthEastIcon sx={{ fontSize: { xs: 16, md: 18 } }} />
      </Box>
    </Box>
  );
};
