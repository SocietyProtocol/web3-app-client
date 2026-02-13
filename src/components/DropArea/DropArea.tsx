"use client";

import React, { useCallback, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import FileUploadIcon from "@mui/icons-material/FileUpload";

interface DropAreaProps {
  descriptionTop?: string;
  descriptionBottom?: string;
  accept?: string; // e.g. "text/csv"
  onFile?: (file: File) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

export const DropArea: React.FC<DropAreaProps> = ({
  descriptionTop,
  descriptionBottom,
  accept,
  onFile,
  error,
  helperText,
  disabled = false,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isDragging, setIsDragging] = useState(false);

  const validateAndEmit = useCallback(
    (file: File) => {
      if (
        accept &&
        file.type &&
        !file.type.match(
          new RegExp(
            accept
              .split(",")
              .map((a) => a.trim().replace("*", ".*"))
              .join("|"),
          ),
        )
      ) {
        enqueueSnackbar("Invalid file type", { variant: "error" });
        return;
      }
      onFile?.(file);
    },
    [accept, onFile, enqueueSnackbar],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setIsDragging(false);

      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        const file = dt.files[0];
        validateAndEmit(file);
      }
    },
    [disabled, validateAndEmit],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      // mark as dragging only when files are present
      const hasFiles =
        Boolean(e.dataTransfer) &&
        Boolean(e.dataTransfer.items) &&
        Array.from(e.dataTransfer.items).some((it) => it.kind === "file");
      setIsDragging(hasFiles);
    },
    [disabled],
  );

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const files = e.target.files;
      if (files && files[0]) validateAndEmit(files[0]);
      e.currentTarget.value = "";
    },
    [disabled, validateAndEmit],
  );

  return (
    <Box
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      sx={(theme) => ({
        width: "100%",
        minHeight: 128,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        borderStyle: disabled ? "solid" : "dashed",
        borderWidth: disabled ? 1 : 2,
        borderColor:
          error && !isDragging
            ? theme.palette.error.main
            : disabled
              ? theme.palette.border.counter
              : theme.palette.border.dropArea,
        borderRadius: 1,
        transition: "background-color 150ms, border-color 150ms",
        position: "relative",
        px: 2,
        py: 2,
        backgroundColor: isDragging
          ? theme.palette.action.hover
          : "transparent",
      })}
    >
      <input
        id="drop-area-file-input"
        type="file"
        accept={accept}
        onChange={onFileInputChange}
        style={{ display: "none" }}
      />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexDirection: {
            xs: "column",
            sm: "row",
          },
        }}
      >
        {!isDragging && (
          <label htmlFor="drop-area-file-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<FileUploadIcon />}
              sx={{ textTransform: "none" }}
              size="small"
              disabled={disabled}
            >
              UPLOAD FILE
            </Button>
          </label>
        )}

        <Typography
          variant="body2"
          color={
            isDragging
              ? "primary"
              : disabled
                ? "text.secondary"
                : "text.primary"
          }
        >
          {isDragging ? "Drop file to upload" : "or drag and drop"}
        </Typography>
      </Box>

      {!isDragging && (
        <Stack spacing={1} sx={{ mt: 1, textAlign: "center" }}>
          {descriptionTop && (
            <Typography
              variant="caption"
              color={disabled ? "text.secondary" : "text.tertiary"}
            >
              {descriptionTop}
            </Typography>
          )}
          {descriptionBottom && (
            <Typography
              variant="caption"
              color={disabled ? "text.secondary" : "text.tertiary"}
              sx={{ display: "block" }}
            >
              {descriptionBottom}
            </Typography>
          )}

          {helperText && (
            <Typography
              variant="caption"
              color={error ? "error" : "text.secondary"}
              sx={{ display: "block" }}
            >
              {helperText}
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default DropArea;
