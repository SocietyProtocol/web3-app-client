import { Governance } from "@/components/Governance/Governance";
import { Page } from "@/components/Page/Page";
import { Box, Typography } from "@mui/material";

export const metadata = {
  title: "Governance",
  description: "Participate in the governance of Society Protocol.",
};

export default function GovernancePage() {
  return (
    <Page>
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>
        <Typography
          variant="h4"
          component="h1"
          color="primary.main"
          sx={{ mb: 6 }}
        >
          Governance
        </Typography>
        <Governance />
      </Box>
    </Page>
  );
}
