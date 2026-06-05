import { Box, Stack, Typography } from "@mui/material";
import { MarkdownRenderer } from "@/components/MarkdownRenderer/MarkdownRenderer";
import { Page } from "@/components/Page/Page";

export const metadata = {
  title: "Badges FAQ",
  description: "Frequently asked questions about Badges on Society Protocol.",
};

export default function BadgesFaqPage() {
  return (
    <Page backButton defaultBackPath="/badges" wideMargin>
      <Box sx={{ maxWidth: 880, mx: "auto" }}>
        <Stack alignItems="center" spacing={1} sx={{ mb: { xs: 4, md: 6 } }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              color: "primary.main",
              fontSize: { xs: "2rem", md: "2.5rem" },
              textAlign: "center",
            }}
          >
            Badges FAQ
          </Typography>
          <Typography sx={{ color: "text.tertiary", textAlign: "center" }}>
            Everything you need to know about Badges on Society Protocol
          </Typography>
        </Stack>

        <MarkdownRenderer src="/api/copywriting/badges-faq" />
      </Box>
    </Page>
  );
}
