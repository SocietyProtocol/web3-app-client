"use client";

import { Box, Button, TextField, TextFieldProps } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { TokenIcon } from "../TokenIcon/TokenIcon";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";

export interface AmountInputProps extends Omit<
  TextFieldProps<"outlined">,
  "onChange" | "value" | "variant"
> {
  label?: string;
  value?: bigint;
  onChange?: (value: bigint | undefined) => void;
  max?: bigint;
  maxLabel?: string;
  disabled?: boolean;
  tokenSymbol?: string;
  decimals?: number;
  readonly?: boolean;
}

export const AmountInput = ({
  label,
  value,
  onChange,
  max,
  maxLabel = "Balance",
  tokenSymbol,
  decimals = 18,
  disabled = false,
  readonly = false,
  ...props
}: AmountInputProps) => {
  const stringValue = useMemo(
    () => (value === undefined ? "" : formatUnits(value, decimals)),
    [value, decimals],
  );

  const [intermediateValue, setIntermediateValue] =
    useState<string>(stringValue);
  const [isFocused, setIsFocused] = useState(false);

  // Sync external value changes when not focused
  const displayValue = isFocused ? intermediateValue : stringValue;

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value;

      // Only allow digits, decimal point, and empty string
      if (inputValue !== "" && !/^\d*\.?\d*$/.test(inputValue)) {
        return;
      }

      setIntermediateValue(inputValue);

      // Empty input
      if (inputValue === "") {
        onChange?.(undefined);
        return;
      }

      // Allow partial decimal inputs
      if (
        inputValue === "." ||
        inputValue.endsWith(".") ||
        inputValue.endsWith(".0")
      ) {
        return;
      }

      // Try to parse and update
      try {
        const bigintValue = parseUnits(inputValue, decimals);

        if (max !== undefined && bigintValue > max) {
          onChange?.(max);
        } else {
          onChange?.(bigintValue);
        }
      } catch {
        // Invalid format, don't update
      }
    },
    [onChange, decimals, max],
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement, Element>) => {
      setIsFocused(false);

      // Clean up the input on blur
      if (intermediateValue && intermediateValue !== ".") {
        try {
          let bigintValue = parseUnits(intermediateValue, decimals);

          if (max !== undefined && bigintValue > max) {
            bigintValue = max;
          }

          // Format to clean value
          setIntermediateValue(formatUnits(bigintValue, decimals));
          onChange?.(bigintValue);
        } catch {
          // Invalid, reset to previous valid value
          setIntermediateValue(stringValue);
        }
      } else if (intermediateValue === ".") {
        setIntermediateValue("");
        onChange?.(undefined);
      }

      props.onBlur?.(event);
    },
    [intermediateValue, decimals, max, stringValue, onChange, props],
  );

  return (
    <Box>
      {(label || (max !== undefined && maxLabel)) && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          {label && (
            <Box
              component="label"
              sx={{
                color: (theme) => theme.palette.primary.main,
                fontSize: "1rem",
                fontWeight: 400,
              }}
            >
              {label}
            </Box>
          )}
          {max !== undefined && maxLabel && (
            <Box
              sx={{
                color: (theme) => theme.palette.text.secondary,
                fontSize: "0.875rem",
                display: "flex",
                gap: 0.5,
                alignItems: "center",
              }}
            >
              <Box component="span">{maxLabel}:</Box>
              <FormattedNumber
                value={max}
                scaleDownDecimals={decimals}
                maxDecimals={4}
                minThreshold={0.0001}
                symbol={tokenSymbol}
                variant="body2"
                color="textPrimary"
                component="span"
              />
            </Box>
          )}
        </Box>
      )}
      <TextField
        {...props}
        variant="outlined"
        placeholder={
          tokenSymbol ? `0.0 ${tokenSymbol.toUpperCase()}` : undefined
        }
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        value={displayValue}
        disabled={disabled}
        slotProps={{
          input: {
            readOnly: readonly,
            inputMode: "decimal",
            startAdornment: !!tokenSymbol && (
              <TokenIcon
                symbol={tokenSymbol}
                size={36}
                style={{ marginRight: 8 }}
              />
            ),

            endAdornment: max !== undefined && !readonly && (
              <Button
                variant="outlined"
                onClick={() => {
                  if (value !== max) {
                    onChange?.(max);
                  }
                }}
                size="small"
                disabled={disabled || value === max}
                aria-label="Set to maximum amount"
              >
                Max
              </Button>
            ),
          },
        }}
      />
    </Box>
  );
};
