import { Divider, Stack, TextField, Typography } from "@mui/material";
import { Controller } from "react-hook-form";
import { useCommunityCreation } from "./CommunityCreationContext";
import { AvatarInput } from "../../AccountSetup/AvatarInput";

export const BadgeDetailsStep = () => {
  const { form } = useCommunityCreation();
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <Stack spacing={3}>
      <Typography variant="body1" color="text.secondary">
        Customize the badges that will be minted for your community
      </Typography>

      <Typography variant="subtitle2" color="text.secondary">
        Manager Badge
      </Typography>

      <TextField
        label="Manager Badge Metadata (JSON)"
        placeholder='{"attributes": []}'
        fullWidth
        multiline
        rows={4}
        {...register("creatorBadgeMetadata")}
        error={Boolean(errors.creatorBadgeMetadata)}
        helperText={
          errors.creatorBadgeMetadata?.message ||
          "Optional: Additional metadata in JSON format"
        }
      />

      <Divider />

      <Typography variant="subtitle2" color="text.secondary">
        Member Badge
      </Typography>

      <Controller
        name="memberBadgeImageUrl"
        control={control}
        render={({ field }) => (
          <AvatarInput
            label="Member Badge Image"
            value={field.value}
            onChange={field.onChange}
            error={Boolean(errors.memberBadgeImageUrl)}
            helperText={errors.memberBadgeImageUrl?.message}
          />
        )}
      />

      <TextField
        label="Member Badge Metadata (JSON)"
        placeholder='{"attributes": []}'
        fullWidth
        multiline
        rows={4}
        {...register("memberBadgeMetadata")}
        error={Boolean(errors.memberBadgeMetadata)}
        helperText={
          errors.memberBadgeMetadata?.message ||
          "Optional: Additional metadata in JSON format"
        }
      />
    </Stack>
  );
};
