"use client";

import {
  Stack,
  TextField,
  Box,
  Checkbox,
  FormControlLabel,
  Typography,
} from "@mui/material";
import { Controller, UseFormReturn } from "react-hook-form";
import { AvatarInput } from "../../AccountSetup/AvatarInput";
import {
  BadgeEditInputData,
  BadgeEditTransformedData,
} from "@/validation/badgeEdit";
import { useHasOfficialBadgeCreatorRole } from "../BadgeCreation/useHasOfficialBadgeCreatorRole";

interface BadgeDetailsEditFormProps {
  form: UseFormReturn<BadgeEditInputData, unknown, BadgeEditTransformedData>;
  isLoading: boolean;
  hasOfficialBadgeCreatorRole: ReturnType<
    typeof useHasOfficialBadgeCreatorRole
  >;
  getServerFieldError: (field: keyof BadgeEditInputData) => string | undefined;
}

export const BadgeDetailsEditForm = ({
  form,
  isLoading,
  hasOfficialBadgeCreatorRole,
  getServerFieldError,
}: BadgeDetailsEditFormProps) => {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <Stack spacing={3}>
      <Controller
        name="imageUrl"
        control={control}
        render={({ field }) => (
          <AvatarInput
            label="Badge Image"
            value={field.value}
            onChange={field.onChange}
            error={
              Boolean(errors.imageUrl) ||
              Boolean(getServerFieldError("imageUrl"))
            }
            helperText={
              errors.imageUrl?.message || getServerFieldError("imageUrl")
            }
            disabled={isLoading}
          />
        )}
      />

      <TextField
        label="Badge Name"
        placeholder="Enter badge name"
        fullWidth
        {...register("name")}
        error={Boolean(errors.name) || Boolean(getServerFieldError("name"))}
        helperText={errors.name?.message || getServerFieldError("name")}
        disabled={isLoading}
      />

      <TextField
        label="Metadata (JSON)"
        placeholder='{"description": "Badge description", "attributes": []}'
        fullWidth
        multiline
        rows={6}
        {...register("metadata")}
        error={
          Boolean(errors.metadata) || Boolean(getServerFieldError("metadata"))
        }
        helperText={
          errors.metadata?.message ||
          getServerFieldError("metadata") ||
          "Optional: Additional metadata in JSON format"
        }
        disabled={isLoading}
      />

      {hasOfficialBadgeCreatorRole.data && (
        <Box>
          <Controller
            name="isOfficial"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={isLoading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Official Badge</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mark this badge as an official badge
                    </Typography>
                  </Box>
                }
              />
            )}
          />
        </Box>
      )}

      <Box>
        <Controller
          name="isCommunity"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={isLoading}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Community Badge</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mark this badge as a community badge
                  </Typography>
                </Box>
              }
            />
          )}
        />
      </Box>
    </Stack>
  );
};
