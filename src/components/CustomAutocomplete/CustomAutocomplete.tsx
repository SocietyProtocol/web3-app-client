import {
  Box,
  Autocomplete,
  AutocompleteProps,
  createFilterOptions,
  TextField,
  CircularProgress,
} from "@mui/material";
import { useMemo, useState } from "react";
import { isEqualCaseInsensitive } from "@/utils/string";
import { WithTooltip } from "../WithTooltip/WithTooltip";
import { ValueDisplay } from "./ValueDisplay";

interface CustomAutocompleteProps<
  T,
  Multiple extends boolean = false,
  DisableClearable extends boolean = false,
  FreeSolo extends boolean = false,
> extends Omit<
  AutocompleteProps<T, Multiple, DisableClearable, FreeSolo>,
  "renderInput"
> {
  label?: string;
  tooltip?: string;
  valueKey: keyof T;
  mapNewValue?: (value: string) => T | undefined;
  validateNewValue?: (value: string) => boolean;
  renderItem: (item: T) => React.ReactNode;
  placeholder?: string;
}

export const CustomAutocomplete = <
  T,
  Multiple extends boolean = false,
  DisableClearable extends boolean = false,
  FreeSolo extends boolean = false,
>({
  label,
  tooltip,
  value,
  onChange,
  options,
  loading = false,
  valueKey,
  mapNewValue,
  validateNewValue,
  getOptionLabel,
  inputValue,
  onInputChange,
  renderItem,
  placeholder,
  multiple,
  freeSolo,
  disableClearable,
}: CustomAutocompleteProps<T, Multiple, DisableClearable, FreeSolo>) => {
  const [open, setOpen] = useState(false);

  const filter = useMemo(() => createFilterOptions<T>(), []);

  return (
    <Box>
      {label && (
        <WithTooltip
          variant="subtitle1"
          fontWeight={600}
          mb={0.5}
          tooltip={tooltip}
        >
          {label}
        </WithTooltip>
      )}

      <Autocomplete
        multiple={multiple}
        freeSolo={freeSolo}
        disableClearable={disableClearable}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={options}
        loading={loading}
        value={value}
        getOptionLabel={getOptionLabel}
        onChange={onChange}
        filterOptions={(options, params) => {
          const filtered = filter(options, params);

          const { inputValue } = params;

          // Suggest the creation of a new value
          const isExisting =
            options.some((option) =>
              isEqualCaseInsensitive(
                inputValue,
                typeof option === "string"
                  ? option
                  : (option[valueKey] as string),
              ),
            ) ||
            (typeof value === "string"
              ? isEqualCaseInsensitive(inputValue, value as string)
              : Array.isArray(value) &&
                value?.some((val) =>
                  isEqualCaseInsensitive(
                    inputValue,
                    typeof val === "string" ? val : (val[valueKey] as string),
                  ),
                ));

          if (
            inputValue !== "" &&
            !isExisting &&
            mapNewValue &&
            (!validateNewValue || validateNewValue(inputValue))
          ) {
            const newItem = mapNewValue(inputValue.toLowerCase());
            if (newItem) {
              filtered.push(newItem);
            }
          }

          return filtered;
        }}
        inputValue={inputValue}
        onInputChange={onInputChange}
        renderValue={(val, getItemProps, ownerState) => {
          if (ownerState.multiple) {
            const items = Array.isArray(val) ? val : val == null ? [] : [val];

            return items.map((item, index) => {
              const { key, ...itemProps } = getItemProps({ index }) as {
                key: string | number;
                className: string;
                disabled: boolean;
                "data-item-index": number;
                tabIndex: -1;
                onDelete: (event: unknown) => void;
              };

              const realValue =
                typeof item === "string" ? item : (item[valueKey] as string);

              return (
                <ValueDisplay<T>
                  {...itemProps}
                  key={key}
                  value={realValue}
                  item={typeof item === "string" ? undefined : item}
                  renderItem={renderItem}
                />
              );
            });
          } else {
            if (val == null) return null;

            if (typeof val === "string") {
              return val;
            }
          }

          return renderItem(val as T);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            placeholder={placeholder}
            sx={{
              "& .MuiInputBase-root": {
                flexWrap: "wrap",
                alignItems: "flex-start",
                minHeight: 40,
                height: "auto !important",
                py: 0.5,
              },
              "& .MuiInputBase-input": {
                flex: 1,
              },
            }}
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
      />
    </Box>
  );
};
