import { Box } from "@mui/material";
import { Page } from "@/components/Page/Page";
import { MarkdownRenderer } from "@/components/MarkdownRenderer/MarkdownRenderer";
import { StakeSpecButton } from "@/components/SpecToken/SpecTokenActions";

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
      <Box
        sx={{
          display: "flex",
          justifyContent: { xs: "center", lg: "flex-start" },
          alignItems: "center",
          position: { xs: "relative", lg: "sticky" },
          top: { xs: 120, lg: 120 },
          width: { xs: "100%", lg: 300 },
          height: "fit-content",
          px: { xs: 2, md: 8, lg: 0 },
          pb: { xs: 4, lg: 0 },
          order: { xs: -1, lg: 2 },
        }}
      >
        <StakeSpecButton />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, order: { xs: 1, lg: 1 } }}>
        <Page title="SPEC Token" wideMargin>
          <MarkdownRenderer
            src="/api/copywriting/spec-token"
            sx={{ maxWidth: 980 }}
          />
        </Page>
      </Box>
    </Box>
  );
}
