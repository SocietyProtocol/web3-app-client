"use client";

import { CommunityDetailsProvider } from "./CommunityDetails.context";
import { CommunityDetails } from "./CommunityDetails";

interface CommunityDetailsPageProps {
  id: string;
}

export function CommunityDetailsPage({ id }: CommunityDetailsPageProps) {
  return (
    <CommunityDetailsProvider id={id}>
      <CommunityDetails />
    </CommunityDetailsProvider>
  );
}
