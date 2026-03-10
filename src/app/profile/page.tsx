import { Profile } from "@/components/Profile/Profile";
import { Suspense } from "react";

export const metadata = {
  title: "Profile",
  description: "View and manage your profile on Society Protocol.",
};

export default function ProfilePage() {
  return (
    <Suspense>
      <Profile />
    </Suspense>
  );
}
