import { Page } from "@/components/Page/Page";
import { LockSpecContent } from "@/components/LockSpec/LockSpecContent";
import { Suspense } from "react";

export const metadata = {
  title: "Lock SPEC",
  description:
    "Lock your SPEC tokens to gain governance influence and community membership.",
};

export default function LockSpecPage() {
  return (
    <Suspense>
      <Page backButton defaultBackPath="/profile">
        <LockSpecContent />
      </Page>
    </Suspense>
  );
}
