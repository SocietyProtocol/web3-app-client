import { Stack, Typography } from "@mui/material";
import { useAccount } from "wagmi";
import { UserCard } from "../User/UserCard";
import { useAccountSetup } from "./AccountSetupContext";
import { useWatch } from "react-hook-form";

export const ReviewStep = () => {
  const { form, username } = useAccountSetup();
  const { address } = useAccount();

  const formValues = useWatch({ control: form.control });

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

      <UserCard
        imageUrl={formValues.imageUrl}
        name={formValues.name || username || "New User"}
        id={address}
        bio={formValues.bio || "Your bio goes here."}
        showAddress
      />
    </Stack>
  );
};
