import { Box, Stack, Typography, TextField } from "@mui/material";
import { useAccount } from "wagmi";
import { Controller } from "react-hook-form";
import { AvatarInput } from "./AvatarInput";
import { truncateAddress } from "@/utils/string";
import { useAccountSetup } from "./AccountSetupContext";

export const AccountInfoStep = () => {
  const { form, getServerFieldError, reset } = useAccountSetup();
  const { address } = useAccount();

  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      {/* Account Details Header */}
      <Typography variant="h6" sx={{ fontWeight: 500 }}>
        Account details {address && truncateAddress(address)}
      </Typography>

      {/* Avatar Section */}
      <Controller
        name="avatar"
        control={form.control}
        render={({ field, fieldState }) => {
          const serverError = getServerFieldError("avatar");
          const error = fieldState.error?.message || serverError;
          const onChange = (value: string | null) => {
            field.onChange(value);
            reset();
          };

          return (
            <AvatarInput
              value={field.value ?? null}
              onChange={onChange}
              error={Boolean(error)}
              helperText={error}
            />
          );
        }}
      />

      {/* Name Field */}
      <Box>
        <Typography
          variant="body1"
          sx={{ mb: { xs: 1, sm: 2 }, fontWeight: 500 }}
        >
          Choose a name
        </Typography>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => {
            const serverError = getServerFieldError("name");
            const error = fieldState.error?.message || serverError;
            const onChange = (value: string) => {
              field.onChange(value);
              reset();
            };
            return (
              <TextField
                fullWidth
                placeholder="Name / Nickname"
                {...field}
                onChange={(e) => onChange(e.target.value)}
                error={Boolean(error)}
                helperText={
                  error || `${(form.watch("name") || "").length}/100 characters`
                }
              />
            );
          }}
        />
      </Box>

      {/* Bio Field */}
      <Box>
        <Typography
          variant="body1"
          sx={{ mb: { xs: 1, sm: 2 }, fontWeight: 500 }}
        >
          Write a short bio
        </Typography>
        <Controller
          name="bio"
          control={form.control}
          render={({ field, fieldState }) => {
            const serverError = getServerFieldError("bio");
            const error = fieldState.error?.message || serverError;
            const onChange = (value: string) => {
              field.onChange(value);
              reset();
            };
            return (
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Tell us more about you."
                {...field}
                onChange={(e) => onChange(e.target.value)}
                error={Boolean(error)}
                helperText={
                  error || `${(form.watch("bio") || "").length}/500 characters`
                }
              />
            );
          }}
        />
      </Box>
    </Stack>
  );
};
