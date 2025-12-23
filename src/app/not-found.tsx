"use client";

import Link from "next/link";
import { Box, Typography, Button } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";

export default function NotFound() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100%",
        textAlign: "center",
        p: 3,
      }}
    >
      <Typography
        variant="h1"
        component="h1"
        sx={{ fontSize: "6rem", fontWeight: "bold", mb: 2 }}
      >
        404
      </Typography>
      <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
        Page Not Found
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: "text.secondary" }}>
        The page you are looking for doesn&apos;t exist or has been moved.
      </Typography>
      <Button
        component={Link}
        href="/"
        variant="contained"
        startIcon={<HomeIcon />}
        sx={{ textTransform: "none" }}
      >
        Back to Home
      </Button>
    </Box>
  );
}
