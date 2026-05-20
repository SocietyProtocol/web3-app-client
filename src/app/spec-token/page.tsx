import { Box, Typography } from "@mui/material";
import { Page } from "@/components/Page/Page";
import { MarkdownRenderer } from "@/components/MarkdownRenderer/MarkdownRenderer";
import { SpecTokenDistributionChart } from "@/components/SpecToken/SpecTokenDistributionChart";

export const metadata = {
  title: "SPEC Token",
  description: "Learn about the SPEC token and its role in Society Protocol.",
};

export default function SpecTokenPage() {
  return (
    <Page>
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>
        <Typography
          variant="h4"
          component="h1"
          color="primary.main"
          sx={{ mb: 6 }}
        >
          SPEC Token
        </Typography>
        <MarkdownRenderer
          src="/api/copywriting/spec-token"
          sx={{
            "& p, & li": { color: "text.primary" },
            "& h4:first-of-type + p": {
              fontSize: { xs: "1.2rem", md: "1.4rem" },
              lineHeight: 1.5,
              mb: 4,
            },
          }}
        />
        <SpecTokenDistributionChart />
      </Box>
    </Page>
  );
}
