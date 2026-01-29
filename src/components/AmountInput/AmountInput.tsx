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
import { TokenIcon } from "../TokenIcon/TokenIcon";

export interface AmountInputProps extends Omit<
  TextFieldProps<"outlined">,
  "onChange" | "value" | "variant"
> {
  label?: string;
  value?: bigint;
  onChange?: (value: bigint | undefined) => void;
  max?: bigint;
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

  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number | null>(null);

  const [intermediateValue, setIntermediateValue] =
    useState<string>(stringValue);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value;

      // check if it's empty
      if (inputValue === "") {
        onChange?.(undefined);
        return;
      }

      const numberValue = Number(inputValue);
      if (isNaN(numberValue)) {
        return;
      }

      let bigintValue;

      try {
        bigintValue = parseUnits(inputValue || "0", decimals);
      } catch {
        return;
      }

      cursorRef.current = event.target.selectionStart;

      if (max !== undefined && bigintValue > max) {
        setIntermediateValue(formatUnits(max, decimals));

        onChange?.(max);
        return;
      }

      setIntermediateValue(inputValue);

      onChange?.(bigintValue);
    },
    [onChange, decimals, max],
  );

  const onBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement, Element>) => {
      if (stringValue !== intermediateValue) {
        let bigintValue;

        try {
          bigintValue = parseUnits(intermediateValue || "0", decimals);
        } catch {
          setIntermediateValue(stringValue);
          return;
        }

        if (bigintValue === value) {
          setIntermediateValue(stringValue);

          return;
        }

        if (max !== undefined && bigintValue > max) {
          onChange?.(max);

          return;
        }

        onChange?.(bigintValue);
      }

      props.onBlur?.(event);
    },
    [stringValue, intermediateValue, value, max, onChange, props, decimals],
  );

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
      variant="outlined"
      label={label}
      placeholder={tokenSymbol ? `0.0 ${tokenSymbol.toUpperCase()}` : undefined}
      onChange={handleChange}
      onBlur={onBlur}
      value={intermediateValue}
      disabled={disabled}
      slotProps={{
        input: {
          inputRef,
          readOnly: readonly,
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
