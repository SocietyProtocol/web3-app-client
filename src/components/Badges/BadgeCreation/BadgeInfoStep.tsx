import {
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Stack,
} from "@mui/material";
import { Controller } from "react-hook-form";
import { useBadgeCreation } from "./BadgeCreationContext";
import { AvatarInput } from "../../AccountSetup/AvatarInput";

export const BadgeInfoStep = () => {
  const { form, getServerFieldError } = useBadgeCreation();
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <Stack spacing={3}>
      <Typography variant="body1" color="text.secondary">
        Enter the basic information for your badge
      </Typography>

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
      />

      <Box>
        <Controller
          name="isOfficial"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox checked={field.value} onChange={field.onChange} />
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

      <Box>
        <Controller
          name="isCommunity"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox checked={field.value} onChange={field.onChange} />
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
