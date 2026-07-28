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
    <Page>
      <Box>
        <Suspense>
          <Communities />
        </Suspense>
      </Box>
    </Page>
  );
}
