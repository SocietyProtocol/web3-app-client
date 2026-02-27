import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  UserAutocomplete,
  UserOption,
} from "../../User/UserAutocomplete/UserAutocomplete";
import { useBadge } from "@/data/badges/useBadge";
import z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useBurnBadgeMutation } from "./useBurnBadgeMutation";
import { burnBadgeValidationSchema } from "./validation";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

interface BurnTabProps {
  id: string;
}

type BurnFormInput = z.input<typeof burnBadgeValidationSchema>;
type BurnFormOutput = z.output<typeof burnBadgeValidationSchema>;

export const BurnTab = ({ id }: BurnTabProps) => {
  const { data } = useBadge(id);
  const queryClient = useQueryClient();

  const holders = useMemo(
    () => data?.badge?.holders.map((h) => h.id.toLowerCase()) || [],
    [data],
  );

  const filterOptions = useCallback(
    (options: UserOption[]) =>
      options.filter((option) => holders.includes(option.id.toLowerCase())),
    [holders],
  );

  const form = useForm<BurnFormInput, unknown, BurnFormOutput>({
    resolver: zodResolver(burnBadgeValidationSchema),
    defaultValues: {
      holder: undefined,
      confirmed: false,
    },
    mode: "onChange",
  });

  const { mutate, transaction } = useBurnBadgeMutation({
    onSuccess: () => {
      form.reset();
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["badge", id] }),
        queryClient.invalidateQueries({ queryKey: ["user"] }),
      ]);
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    mutate({ id: BigInt(id), holder: values.holder });
  });

  return (
    <Stack marginTop={3} spacing={3} sx={{ minHeight: 200 }}>
      <Box>
        <Stack spacing={2}>
          <Controller
            name="holder"
            control={form.control}
            render={({ field, fieldState }) => (
              <UserAutocomplete
                label="Badge Holder"
                tooltip="Select the holder whose badge will be burned"
                value={field.value}
                onChange={(_, newValue) => {
                  const newId =
                    typeof newValue === "string" ? newValue : newValue?.id;
                  field.onChange(newId ?? "");
                }}
                filterOptions={filterOptions}
                disabled={transaction.isLoading || holders.length === 0}
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Stack direction="row" spacing={1} alignItems="flex-start">
            <WarningAmberIcon sx={{ color: "error.main" }} />
            <Typography color="error.main">
              Burning a badge is irreversible. This action permanently removes
              the badge.
            </Typography>
          </Stack>

          <Controller
            name="confirmed"
            control={form.control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.value}
                    onChange={field.onChange}
                    disabled={transaction.isLoading}
                    sx={{ ml: "-9px" }}
                  />
                }
                label="I understand this action cannot be undone."
                sx={{ ml: 0 }}
              />
            )}
          />
        </Stack>
      </Box>

      <Box>
        <Button
          variant="outlined"
          color="error"
          disabled={!form.formState.isValid || transaction.isLoading}
          size="small"
          sx={{ minWidth: 160 }}
          onClick={handleSubmit}
          loading={transaction.isLoading}
          loadingIndicator={
            <Box display="flex" alignItems="center" gap={4}>
              Burning... <CircularProgress size={20} />
            </Box>
          }
        >
          Burn Badge
        </Button>
      </Box>
    </Stack>
  );
};

export default BurnTab;
