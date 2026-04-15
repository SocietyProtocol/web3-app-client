"use client";

import { Page } from "@/components/Page/Page";
import { MarkdownRenderer } from "@/components/MarkdownRenderer/MarkdownRenderer";

export default function Home() {
  return (
    <Page wideMargin>
      <MarkdownRenderer
        src="/api/copywriting/general-info"
        sx={{ mt: { xs: 3, sm: 5 }, maxWidth: 980 }}
      />
    </Page>
  );
}
