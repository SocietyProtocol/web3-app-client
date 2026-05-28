import { Box, Paper, Stack, Typography } from "@mui/material";
import { MarkdownRenderer } from "@/components/MarkdownRenderer/MarkdownRenderer";
import { Page } from "@/components/Page/Page";
import { ReferralForms } from "@/components/Referrals/ReferralForms";

export const metadata = {
  title: "Referral Program",
  description:
    "Generate referral codes or accept an invitation to join Society Protocol.",
};

export default function ReferralsPage() {
  return (
    <Page backButton defaultBackPath="/profile" wideMargin>
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
            Referral Program
          </Typography>
          <Typography sx={{ color: "text.tertiary", textAlign: "center" }}>
            Invite trusted members and accept invitations on-chain.
          </Typography>
        </Stack>

        <MarkdownRenderer src="/api/copywriting/referral-program-intro" />

        <Paper
          elevation={1}
          sx={{
            my: { xs: 4, md: 6 },
            p: { xs: 2, md: 4 },
            borderRadius: 2,
            boxShadow: "none",
          }}
        >
          <ReferralForms />
        </Paper>

        <MarkdownRenderer src="/api/copywriting/referral-program-faq" />
      </Box>
    </Page>
  );
}
