"use client";

import { Button, TextField, TextFieldProps } from "@mui/material";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatUnits, parseUnits } from "viem";
import { SafeImage } from "../SafeImage/SafeImage";

export interface AmountInputProps
  extends Omit<TextFieldProps<"filled">, "onChange" | "value" | "variant"> {
  label?: string;
  value?: bigint;
  onChange?: (value: bigint | undefined) => void;
  max?: bigint;
  disabled?: boolean;
  tokenSymbol: string;
  decimals?: number;
}

export const AmountInput = ({
  label,
  value,
  onChange,
  max,
  tokenSymbol,
  decimals = 18,
  disabled = false,
  ...props
}: AmountInputProps) => {
  const stringValue = useMemo(
    () => (value === undefined ? "" : formatUnits(value, decimals)),
    [value, decimals]
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);

  const [intermediateValue, setIntermediateValue] =
    useState<string>(stringValue);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value;

      cursorRef.current = event.target.selectionStart;

      // check if it's empty
      if (inputValue === "") {
        onChange?.(undefined);
        return;
      }

      const numberValue = Number(inputValue);
      if (isNaN(numberValue)) {
        return;
      }

      const bigintValue = parseUnits(inputValue || "0", decimals);

      if (max !== undefined && bigintValue > max) {
        setIntermediateValue(formatUnits(max, decimals));

        onChange?.(max);
        return;
      }

      setIntermediateValue(inputValue);

      onChange?.(bigintValue);
    },
    [onChange, decimals, max]
  );

  const onBlur = useCallback(() => {
    if (stringValue !== intermediateValue) {
      const bigIntValue = parseUnits(intermediateValue || "0", decimals);

      if (bigIntValue === value) {
        setIntermediateValue(stringValue);
        return;
      }

      if (max !== undefined && bigIntValue > max) {
        onChange?.(max);
        return;
      }

      onChange?.(bigIntValue);
    }
  }, [intermediateValue, stringValue, value, decimals, max, onChange]);

  useEffect(() => {
    setIntermediateValue(stringValue);
  }, [stringValue]);

  useLayoutEffect(() => {
    if (inputRef.current && cursorRef.current !== null) {
      inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
      cursorRef.current = null;
    }
  }, [intermediateValue]);

  return (
    <TextField
      {...props}
      label={label}
      placeholder={`0.0 ${tokenSymbol.toUpperCase()}`}
      onChange={handleChange}
      onBlur={onBlur}
      value={intermediateValue}
      disabled={disabled}
      slotProps={{
        input: {
          inputRef,
          startAdornment: (
            <SafeImage
              src={`/tokens/${tokenSymbol?.toLowerCase()}.svg`}
              alt={tokenSymbol}
              width={36}
              height={36}
              style={{ marginRight: 4 }}
            />
          ),

          endAdornment: max && (
            <Button
              variant="outlined"
              onClick={() => {
                if (value !== max) {
                  onChange?.(max);
                }
              }}
              size="small"
              disabled={disabled || value === max}
            >
              Max
            </Button>
          ),
        },

        inputLabel: {
          sx: {
            color: (theme) => `${theme.palette.primary.main} !important`,
            marginBottom: (theme) => `${theme.spacing(1)} !important`,
          },
        },
      }}
    />
  );
};
