import {
  Box,
  Select,
  MenuItem,
  TextField,
  FormHelperText,
  IconButton,
  InputAdornment,
  type SelectChangeEvent,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export interface FilterSelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface FilterSelectProps<T extends string> {
  label: string;
  value: T;
  options: FilterSelectOption<T>[];
  onChange: (value: T) => void;
  minWidth?: number | string;
  customOption?: T;
  customInputValue?: string;
  onCustomInputChange?: (value: string) => void;
  customInputPlaceholder?: string;
  customInputValidate?: (value: string) => boolean;
  customInputErrorText?: string;
}

export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  minWidth = 160,
  customOption,
  customInputValue = "",
  onCustomInputChange,
  customInputPlaceholder,
  customInputValidate,
  customInputErrorText,
}: FilterSelectProps<T>) {
  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value as T);
  };

  const showCustomInput = customOption && value === customOption;
  const hasError =
    showCustomInput &&
    customInputValue.trim() !== "" &&
    customInputValidate?.(customInputValue) === false;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        paddingTop: 1.25,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            minWidth,
          }}
        >
          <Box component="span" sx={{ whiteSpace: "nowrap" }}>
            {label}
          </Box>
          <Select
            value={value}
            onChange={handleChange}
            variant="standard"
            size="small"
            error={hasError}
            disableUnderline
          >
            {options.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </Box>
        {showCustomInput && onCustomInputChange && (
          <TextField
            placeholder={customInputPlaceholder}
            value={customInputValue}
            onChange={(e) => onCustomInputChange(e.target.value)}
            size="small"
            sx={{ minWidth: { xs: "100%", md: 200 } }}
            error={hasError}
            variant="standard"
            InputProps={{
              endAdornment: customInputValue ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => onCustomInputChange("")}
                    edge="end"
                    sx={{ padding: 0.5 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        )}
      </Box>

      <FormHelperText
        error
        sx={{
          mx: 0,
          height: "1.5rem",
          visibility: hasError ? "visible" : "hidden",
        }}
      >
        {customOption && (hasError ? customInputErrorText : " ")}
      </FormHelperText>
    </Box>
  );
}
