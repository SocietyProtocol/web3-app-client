import { Box, Button, CircularProgress, Stack } from "@mui/material";
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
import { useTransferBadgeMutation } from "./useTransferBadgeMutation";
import { transferBadgeValidationSchema } from "./validation";

interface TransferTabProps {
  id: string;
}

type TransferFormInput = z.input<typeof transferBadgeValidationSchema>;
type TransferFormOutput = z.output<typeof transferBadgeValidationSchema>;

export const TransferTab = ({ id }: TransferTabProps) => {
  const { data } = useBadge(id);
  const queryClient = useQueryClient();

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

  const { mutate, transaction } = useTransferBadgeMutation({
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
    mutate({ id: BigInt(id), from: values.from, to: values.to });
  });

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

      <Box>
        <Button
          variant="outlined"
          disabled={!form.formState.isValid || transaction.isLoading}
          size="small"
          sx={{ minWidth: 160 }}
          onClick={handleSubmit}
          loading={transaction.isLoading}
          loadingIndicator={
            <Box display="flex" alignItems="center" gap={4}>
              Transferring... <CircularProgress size={20} />
            </Box>
          }
        >
          Transfer Badge
        </Button>
      </Box>
    </Stack>
  );
};

export default TransferTab;
