"use client";

import { Box, Typography } from "@mui/material";

const SHAPE_IMAGE_URL = "/images/sp-abstract-bg.png";

export const WhyNowCard = () => {
  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: { xs: 6, md: 7 },
        padding: { xs: 3, md: 4 },
        overflow: "hidden",
        minHeight: { md: 360 },
        display: "flex",
        flexDirection: "column",
        gap: 2,
        backgroundColor: "common.black",
        border: (theme) => `1px solid ${theme.palette.border.bubble}`,
        color: "primary.main",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${SHAPE_IMAGE_URL})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          pointerEvents: "none",
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.7) 100%)",
          pointerEvents: "none",
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Typography
          variant="h5"
          component="h3"
          sx={{
            fontSize: { xs: "1.5rem", md: "1.75rem" },
            mb: 3,
            lineHeight: 1.2,
          }}
        >
          WHY NOW?
        </Typography>

        <Typography
          sx={{
            fontSize: "1rem",
            fontWeight: 600,
            lineHeight: 1.4,
            mb: 2,
          }}
        >
          Early accounts will define the history of the protocol.
        </Typography>

        <Typography
          sx={{
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            opacity: 0.9,
            mb: 1.5,
          }}
        >
          There will only ever be one first fundraise. There will only ever be
          one set of original accounts.
        </Typography>

        <Typography
          sx={{
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            opacity: 0.9,
          }}
        >
          The people here now are the ones who will look back and say they were
          there from the beginning — with the badges and history to prove it.
        </Typography>
      </Box>
    </Box>
  );
};
