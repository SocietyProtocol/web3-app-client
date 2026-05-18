import { Box, Stack, Typography } from "@mui/material";
import { MarkdownRenderer } from "@/components/MarkdownRenderer/MarkdownRenderer";
import { Page } from "@/components/Page/Page";

export const metadata = {
  title: "Communities FAQ",
  description:
    "Frequently asked questions about Communities on Society Protocol.",
};

export default function CommunitiesFaqPage() {
  return (
    <Page backButton defaultBackPath="/communities" wideMargin>
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
            Communities FAQ
          </Typography>
          <Typography sx={{ color: "text.tertiary", textAlign: "center" }}>
            Everything you need to know about creating and managing a community
          </Typography>
        </Stack>

        <MarkdownRenderer src="/api/copywriting/communities-faqs" />
      </Box>
    </Page>
  );
}
