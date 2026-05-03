"use client";

import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import {
  IconButton,
  InputAdornment,
  SxProps,
  TextField,
  Theme,
} from "@mui/material";

interface SearchBoxProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  sx?: SxProps<Theme>;
  disabled?: boolean;
}

export function SearchBox({
  id,
  value,
  onChange,
  placeholder,
  sx,
  disabled,
}: SearchBoxProps) {
  return (
    <TextField
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      size="small"
      sx={sx}
      disabled={disabled}
      slotProps={{
        input: {
          slotProps: {
            input: {
              sx: {
                textOverflow: "ellipsis",
              },
            },
          },
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                edge="end"
                onClick={() => onChange("")}
                aria-label="Clear search"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
      }}
    />
  );
}
