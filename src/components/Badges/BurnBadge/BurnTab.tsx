import {
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo } from "react";
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
import { Hex } from "viem";
import { SimulationError } from "@/components/Transaction/SimulationError";
import { useBadgeBalanceOf } from "@/data/badges/useBadgeBalanceOf";
import { BadgeAmountField } from "../BadgeAmountField";
import {
  badgeAmountMaxError,
  badgeActionAmount,
  canChooseBadgeAmount,
  DEFAULT_BADGE_AMOUNT,
  maxBadgeAmount,
} from "../badgeAmount";

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
      amount: DEFAULT_BADGE_AMOUNT,
      confirmed: false,
    },
    mode: "onChange",
  });

  const formValues = useWatch({ control: form.control });

  // The holder's copies of this badge cap the amount.
  const { data: holderBalance } = useBadgeBalanceOf(
    formValues.holder as Hex | undefined,
    id,
  );
  const maxAmount = maxBadgeAmount(holderBalance, !!data?.badge?.profileUser);
  const showAmount = canChooseBadgeAmount(maxAmount);
  const amount = badgeActionAmount(formValues.amount, maxAmount);
  const amountMaxError = badgeAmountMaxError(amount, maxAmount);

  // A hidden amount field must not keep the form invalid: reset it to 1.
  useEffect(() => {
    if (!showAmount && formValues.amount !== DEFAULT_BADGE_AMOUNT) {
      form.setValue("amount", DEFAULT_BADGE_AMOUNT, { shouldValidate: true });
    }
  }, [showAmount, formValues.amount, form]);

  const transaction = useBurnBadgeMutation({
    args:
      formValues.holder &&
      form.formState.isValid &&
      amount !== undefined &&
      !amountMaxError
        ? { id: BigInt(id), holder: formValues.holder as Hex, amount }
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
                  form.setValue("amount", DEFAULT_BADGE_AMOUNT, {
                    shouldValidate: true,
                  });
                }}
                filterOptions={filterOptions}
                disabled={transaction.isLoading || holders.length === 0}
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
                inputTestId="burn-holder-input"
              />
            )}
          />

          {showAmount && maxAmount !== undefined && (
            <Controller
              name="amount"
              control={form.control}
              render={({ field, fieldState }) => (
                <BadgeAmountField
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  max={maxAmount}
                  tooltip="How many of the holder's copies to burn"
                  disabled={transaction.isLoading}
                  error={fieldState.error?.message ?? amountMaxError}
                />
              )}
            />
          )}

          {!showAmount && amountMaxError && (
            <Typography color="error.main" variant="body2">
              {amountMaxError}
            </Typography>
          )}

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
            !!amountMaxError ||
            transaction.simulation.isFetching ||
            transaction.simulation.isError
          }
          size="small"
          sx={{ minWidth: 160 }}
          onClick={handleSubmit}
          simulating={transaction.simulation.isFetching}
          loading={transaction.isLoading}
          loadingText="Burning..."
          data-testid="burn-submit"
          gas={transaction.gas}
          gasLoading={transaction.gasLoading}
          gasError={transaction.gasError}
        >
          Burn Badge
        </TransactionButton>
      </Box>
    </Stack>
  );
};

export default BurnTab;
