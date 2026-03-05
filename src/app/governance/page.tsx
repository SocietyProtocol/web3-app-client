import { Governance } from "@/components/Governance/Governance";
import { Page } from "@/components/Page/Page";

export const metadata = {
  title: "Governance",
  description: "Participate in the governance of Society Protocol.",
};

export default function GovernancePage() {
  return (
    <Page title="Governance">
      <Governance />
    </Page>
  );
}
