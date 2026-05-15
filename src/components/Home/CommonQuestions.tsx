"use client";

import { Box, Stack, Typography } from "@mui/material";
import { MarkdownRenderer } from "../MarkdownRenderer/MarkdownRenderer";

export const CommonQuestions = () => {
  return (
    <Box sx={{ mt: { xs: 8, md: 12 }, maxWidth: 880, marginX: "auto" }}>
      <Stack alignItems="center" spacing={1} sx={{ mb: { xs: 4, md: 6 } }}>
        <Typography
          variant="h4"
          component="h2"
          sx={{
            color: "primary.main",
            fontSize: { xs: "2rem", md: "2.5rem" },
            textAlign: "center",
          }}
        >
          Common Questions
        </Typography>
        <Typography sx={{ color: "text.tertiary", textAlign: "center" }}>
          Here&apos;s a quick overview of Society Protocol
        </Typography>
      </Stack>

      <MarkdownRenderer src="/api/copywriting/home-faqs" />
    </Box>
  );
};
