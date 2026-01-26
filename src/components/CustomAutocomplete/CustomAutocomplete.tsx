import {
  Box,
  TextField,
  Stack,
  IconButton,
  Autocomplete,
  CircularProgress,
  AutocompleteProps,
  createFilterOptions,
} from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import CancelIcon from "@mui/icons-material/Cancel";
import { isEqualCaseInsensitive } from "@/utils/string";
import { WithTooltip } from "../WithTooltip/WithTooltip";

interface CustomAutocompleteProps<T> extends Omit<
  AutocompleteProps<T, true, false, false>,
  "onChange" | "renderInput"
> {
  label: string;
  tooltip?: string;
  onChange: (value: string[]) => void;
  valueKey: keyof T;
  mapNewValue?: (value: string) => T | undefined;
  validateNewValue?: (value: string) => boolean;
  renderItem: (item: T) => React.ReactNode;
  placeholder?: string;
}

export const CustomAutocomplete = <T,>({
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
}: CustomAutocompleteProps<T>) => {
  const [open, setOpen] = useState(false);

  const filter = useMemo(() => createFilterOptions<T>(), []);

  const handleRemove = useCallback(
    (removedItemValue: string) => {
      onChange(
        value
          ?.filter(
            (v) =>
              !isEqualCaseInsensitive(v[valueKey] as string, removedItemValue),
          )
          .map((item) => item[valueKey] as string) ?? [],
      );
    },
    [onChange, value, valueKey],
  );

  return (
    <Box>
      <WithTooltip
        variant="subtitle1"
        fontWeight={600}
        mb={0.5}
        tooltip={tooltip}
      >
        {label}
      </WithTooltip>

      <Autocomplete
        multiple
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={options}
        loading={loading}
        value={value}
        getOptionLabel={getOptionLabel}
        onChange={(_, newValue) => {
          if (newValue && "inputValue" in newValue && newValue.inputValue) {
            onChange([(newValue.inputValue as string).toLowerCase()]);
          } else {
            onChange(
              (newValue as T[]).map((item) =>
                (item[valueKey] as string).toLowerCase(),
              ),
            );
          }
        }}
        filterOptions={(options, params) => {
          const filtered = filter(options, params);

          const { inputValue } = params;
          // Suggest the creation of a new value
          const isExisting =
            options.some((option) =>
              isEqualCaseInsensitive(inputValue, option[valueKey] as string),
            ) ||
            value?.some((val) =>
              isEqualCaseInsensitive(inputValue, val[valueKey] as string),
            );

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
        renderValue={(value, getItemProps) =>
          value.map((item, index) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { key, onDelete, ...itemProps } = getItemProps({ index });

            const realValue =
              typeof item === "string" ? item : (item[valueKey] as string);

            return (
              <Box
                key={key}
                {...itemProps}
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  mr: 0.5,
                  mb: 0.5,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  {renderItem(item)}

                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(realValue);
                    }}
                    sx={{
                      p: 0.25,
                      ml: 0.5,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <CancelIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Stack>
              </Box>
            );
          })
        }
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
                minWidth: "120px !important",
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
