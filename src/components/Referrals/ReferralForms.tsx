"use client";

import { Stack } from "@mui/material";
import { ReferralCodeGenerator } from "../ProfileDataCard/ReferralCodeGenerator";
import { AcceptInvitation } from "../ProfileDataCard/AcceptInvitation";
import { useAccount } from "wagmi";
import { useUserQuery } from "@/data/users/useUserQuery";

/**
 * Bundles the two referral-related forms (generate a code, accept an
 * invitation) so they can be rendered together on the dedicated
 * /referrals page. AcceptInvitation only renders when the current user
 * has not yet been referred — once invited, generating codes is still
 * available, but the accept form is hidden.
 */
export const ReferralForms = () => {
  const { address } = useAccount();
  const user = useUserQuery(address);
  const showAcceptInvitation = !user.isLoading && !user.data?.invitedBy;

  return (
    <Stack spacing={{ xs: 4, md: 5 }}>
      {showAcceptInvitation && <AcceptInvitation />}
      <ReferralCodeGenerator />
    </Stack>
  );
};
