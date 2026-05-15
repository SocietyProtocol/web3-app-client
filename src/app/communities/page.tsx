import { ButtonLink } from "@/components/ButtonLink";
import { Communities } from "@/components/Communities/Communities";
import { Page } from "@/components/Page/Page";
import { Box } from "@mui/material";
import { Suspense } from "react";

export const metadata = {
  title: "Communities",
  description: "Explore and manage communities on Society Protocol.",
};

export default function CommunitiesPage() {
  return (
    <Page
      wideMargin
      title="Communities"
      rightAction={
        <Box display="flex" gap={2} alignItems="center">
          {/* TODO: complete the Communities FAQ section, then re-enable this link */}
          {/* <Link
            href="/communities-faq"
            style={{
              textDecoration: "underline",
              fontSize: "1rem",
            }}
          >
            Learn more about communities
          </Link> */}
          <ButtonLink
            variant="contained"
            sx={{
              maxWidth: { xs: "100% !important", sm: "220px !important" },
              whiteSpace: "nowrap",
              minWidth: "154px !important",
              flex: 1,
            }}
            href="/create-community"
          >
            Create Community
          </ButtonLink>
        </Box>
      }
    >
      <Box>
        <Suspense>
          <Communities />
        </Suspense>
      </Box>
    </Page>
  );
}
