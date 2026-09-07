import { Badges } from "@/components/Badges/Badges";
import { BadgesHeader } from "@/components/Badges/BadgesHeader";
import { Page } from "@/components/Page/Page";
import { Box } from "@mui/material";
import { Suspense } from "react";

export const metadata = {
  title: "Badges",
  description: "Explore and manage badges on Society Protocol.",
};

export default function BadgesPage() {
  return (
    <Page title="Badges">
      <Box>
        <BadgesHeader />
        <Suspense>
          <Badges />
        </Suspense>
      </Box>
    </Page>
  );
}
