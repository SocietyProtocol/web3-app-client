import { Box } from "@mui/material";
import { Page } from "@/components/Page/Page";
import { MarkdownRenderer } from "@/components/MarkdownRenderer/MarkdownRenderer";
import { SpecTokenDistributionChart } from "@/components/SpecToken/SpecTokenDistributionChart";

export const metadata = {
  title: "SPEC Token",
  description: "Learn about the SPEC token and its role in Society Protocol.",
};

export default function SpecTokenPage() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", lg: "row" },
        gap: { xs: 3, md: 4, lg: 6 },
        alignItems: { xs: "stretch", lg: "flex-start" },
        width: "100%",
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0, order: { xs: 1, lg: 1 } }}>
        <Page title="SPEC Token" wideMargin>
          <Box sx={{ maxWidth: 980 }}>
            <MarkdownRenderer src="/api/copywriting/spec-token" />
            <SpecTokenDistributionChart />
          </Box>
        </Page>
      </Box>
    </Box>
  );
}
