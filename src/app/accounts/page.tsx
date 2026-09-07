import { Accounts } from "@/components/Accounts/Accounts";
import { Page } from "@/components/Page/Page";
import { Suspense } from "react";

export const metadata = {
  title: "Accounts",
  description: "Explore and manage user accounts on Society Protocol.",
};

export default function AccountsPage() {
  return (
    <Page title="Accounts">
      <Suspense>
        <Accounts />
      </Suspense>
    </Page>
  );
}
