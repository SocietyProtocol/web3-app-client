import { Profile } from "@/components/Profile/Profile";
import { Suspense } from "react";

export default function ProfilePage() {
  return (
    <Suspense>
      <Profile />
    </Suspense>
  );
}
