import { Page } from "@/components/Page/Page";
import { StakeSpecButton } from "@/components/SpecToken/SpecTokenActions";
import { SpecTokenContent } from "@/components/SpecToken/SpecTokenContent";

export const metadata = {
  title: "SPEC Token",
  description: "Learn about the SPEC token and its role in Society Protocol.",
};

export default function SpecTokenPage() {
  return (
    <Page title="SPEC Token" wideMargin rightAction={<StakeSpecButton />}>
      <SpecTokenContent />
    </Page>
  );
}
