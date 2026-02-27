import { Box, Stack } from "@mui/material";
import { useCallback, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  UserAutocomplete,
  UserOption,
} from "../../User/UserAutocomplete/UserAutocomplete";
import { useBadge } from "@/data/badges/useBadge";
import z from "zod";
import { transferBadgeValidationSchema } from "./validation";
import { TransactionButton } from "@/components/Transaction/TransactionButton";
import { SimulationError } from "@/components/Transaction/SimulationError";
import { isAddress } from "viem";
import { useTransferBadgeMutation } from "./useTransferBadgeMutation";

interface TransferTabProps {
  id: string;
}

type TransferFormInput = z.input<typeof transferBadgeValidationSchema>;
type TransferFormOutput = z.output<typeof transferBadgeValidationSchema>;

export const TransferTab = ({ id }: TransferTabProps) => {
  const { data } = useBadge(id);

  const holders = useMemo(
    () => data?.badge?.holders.map((h) => h.id.toLowerCase()) || [],
    [data],
  );

  const filterFromOptions = useCallback(
    (options: UserOption[]) =>
      options.filter((option) => holders.includes(option.id.toLowerCase())),
    [holders],
  );

  const filterToOptions = useCallback(
    (options: UserOption[]) =>
      options.filter((option) => !holders.includes(option.id.toLowerCase())),
    [holders],
  );

  const form = useForm<TransferFormInput, unknown, TransferFormOutput>({
    resolver: zodResolver(transferBadgeValidationSchema),
    defaultValues: {
      from: undefined,
      to: undefined,
    },
    mode: "onChange",
  });

  // Watch form values for simulation
  const { from: fromValue, to: toValue } = useWatch({ control: form.control });

  const transaction = useTransferBadgeMutation({
    args:
      fromValue &&
      toValue &&
      isAddress(fromValue) &&
      isAddress(toValue) &&
      form.formState.isValid
        ? {
            id: BigInt(id),
            from: fromValue,
            to: toValue,
          }
        : undefined,
    onSuccess: () => {
      form.reset();
    },
  });

  const handleSubmit = form.handleSubmit(() => transaction.execute());

  return (
    <Stack marginTop={3} spacing={3} sx={{ minHeight: 200 }}>
      <Box>
        <Stack spacing={2}>
          <Controller
            name="from"
            control={form.control}
            render={({ field, fieldState }) => (
              <UserAutocomplete
                label="From"
                tooltip="Select the current holder to transfer the badge from"
                value={field.value}
                onChange={(_, newValue) => {
                  const newId =
                    typeof newValue === "string" ? newValue : newValue?.id;
                  field.onChange(newId ?? "");
                }}
                filterOptions={filterFromOptions}
                disabled={transaction.isLoading || holders.length === 0}
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
              />
            )}
          />

          <Controller
            name="to"
            control={form.control}
            render={({ field, fieldState }) => (
              <UserAutocomplete
                label="To"
                tooltip="Recipient address (search users or paste an address)"
                value={field.value}
                onChange={(_, newValue) => {
                  const newId =
                    typeof newValue === "string" ? newValue : newValue?.id;
                  field.onChange(newId ?? "");
                }}
                freeSolo
                filterOptions={filterToOptions}
                disabled={transaction.isLoading}
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
              />
            )}
          />
        </Stack>
      </Box>

      <SimulationError error={transaction.simulation.error} />

      <Box>
        <TransactionButton
          variant="outlined"
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
          loadingText="Transferring..."
        >
          Transfer Badge
        </TransactionButton>
      </Box>
    </Stack>
  );
};

export default TransferTab;
