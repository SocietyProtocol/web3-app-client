import { Stack, Typography } from "@mui/material";
import { useAccount } from "wagmi";
import { ProfileCard } from "../ProfileCard/ProfileCard";
import { useAccountSetup } from "./AccountSetupContext";

export const ReviewStep = () => {
  const { form, profileId } = useAccountSetup();
  const { address } = useAccount();

  const formValues = form.watch();

  return (
    <Stack spacing={{ xs: 2, sm: 3 }} alignItems="flex-start">
      <Typography
        variant="h6"
        sx={{
          fontWeight: 500,
          mb: { xs: 1, sm: 2 },
          fontSize: { xs: "1rem", sm: "1.25rem" },
        }}
      >
        Review your information
      </Typography>

      <ProfileCard
        avatar={formValues.avatar ?? null}
        name={formValues.name || `User #${profileId ?? "N/A"}`}
        address={address}
        bio={formValues.bio || "Your bio goes here."}
        showAddress
      />
    </Stack>
  );
};
