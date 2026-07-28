import { Stack, TextField, Typography } from "@mui/material";
import { Controller } from "react-hook-form";
import { useCommunityCreation } from "./CommunityCreationContext";
import { AvatarInput } from "../../AccountSetup/AvatarInput";

export const CommunityInfoStep = () => {
  const { form } = useCommunityCreation();
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <Stack spacing={3}>
      <Typography variant="body1" color="text.secondary">
        Enter the basic information for your community
      </Typography>

      <Controller
        name="creatorBadgeImageUrl"
        control={control}
        render={({ field }) => (
          <AvatarInput
            label="Community Logo"
            value={field.value}
            onChange={field.onChange}
            error={Boolean(errors.creatorBadgeImageUrl)}
            helperText={
              errors.creatorBadgeImageUrl?.message ||
              "Used as the manager badge image and to represent the community"
            }
          />
        )}
      />

      <TextField
        label="Community Name"
        placeholder="Enter community name"
        fullWidth
        {...register("name")}
        error={Boolean(errors.name)}
        helperText={errors.name?.message}
      />

      <TextField
        label="Description"
        placeholder="Describe your community"
        fullWidth
        multiline
        rows={4}
        {...register("description")}
        error={Boolean(errors.description)}
        helperText={
          errors.description?.message ||
          "Briefly describe the purpose of your community"
        }
      />
    </Stack>
  );
};
