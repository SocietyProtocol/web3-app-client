import {
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  UserAutocomplete,
  UserOption,
} from "../../User/UserAutocomplete/UserAutocomplete";
import { useBadge } from "@/data/badges/useBadge";
import z from "zod";
import { TransactionButton } from "@/components/Transaction/TransactionButton";
import { burnBadgeValidationSchema } from "./validation";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useBurnBadgeMutation } from "./useBurnBadgeMutation";
import { isAddress } from "viem";
import { SimulationError } from "@/components/Transaction/SimulationError";

interface BurnTabProps {
  id: string;
}

type BurnFormInput = z.input<typeof burnBadgeValidationSchema>;
type BurnFormOutput = z.output<typeof burnBadgeValidationSchema>;

export const BurnTab = ({ id }: BurnTabProps) => {
  const { data } = useBadge(id);

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

  const formValues = useWatch({ control: form.control });

  const transaction = useBurnBadgeMutation({
    args:
      formValues.holder &&
      isAddress(formValues.holder) &&
      form.formState.isValid
        ? { id: BigInt(id), holder: formValues.holder }
        : undefined,
    onSuccess: () => form.reset(),
  });

  const handleSubmit = form.handleSubmit(() => transaction.execute());

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

      <SimulationError error={transaction.simulation.error} />

      <Box>
        <TransactionButton
          variant="outlined"
          color="error"
          disabled={
            !form.formState.isValid ||
            transaction.simulation.isFetching ||
            transaction.simulation.isError
          }
          size="small"
          sx={{ minWidth: 160 }}
          onClick={handleSubmit}
          simulating={transaction.simulation.isFetching}
          loading={transaction.isLoading}
          loadingText="Burning..."
        >
          Burn Badge
        </TransactionButton>
      </Box>
    </Stack>
  );
};

export default BurnTab;
