"use client";

import React, { useCallback, useState } from "react";
import {
  Box,
  Button,
  Typography,
  useTheme,
  useMediaQuery,
  SxProps,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";

interface DropAreaProps {
  descriptionTop?: string;
  descriptionBottom?: string;
  accept?: string; // e.g. "text/csv"
  maxSizeBytes?: number; // e.g. 2 * 1024 * 1024
  onFile?: (file: File) => void;
}

export const DropArea: React.FC<DropAreaProps> = ({
  descriptionTop,
  descriptionBottom,
  accept,
  maxSizeBytes = 2 * 1024 * 1024,
  onFile,
}) => {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndEmit = useCallback(
    (file: File) => {
      setError(null);
      if (accept && file.type && !file.type.match(accept)) {
        setError("File type not supported");
        return;
      }
      if (maxSizeBytes && file.size > maxSizeBytes) {
        setError("File is too large");
        return;
      }
      onFile?.(file);
    },
    [accept, maxSizeBytes, onFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        const file = dt.files[0];
        validateAndEmit(file);
      }
    },
    [validateAndEmit],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // mark as dragging only when files are present
    const hasFiles =
      Boolean(e.dataTransfer) &&
      Boolean(e.dataTransfer.items) &&
      Array.from(e.dataTransfer.items).some((it) => it.kind === "file");
    setIsDragging(hasFiles);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files[0]) validateAndEmit(files[0]);
      e.currentTarget.value = "";
    },
    [validateAndEmit],
  );

  const contentSx: SxProps = {
    display: "flex",
    alignItems: "center",
    gap: 1,
    flexDirection: isSm ? "column" : "row",
  };

  return (
    <Box
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      sx={(theme) => ({
        width: "100%",
        height: 116,
        boxSizing: "border-box",
        py: 1, // 8px vertical padding
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        borderStyle: "dashed",
        borderWidth: 2,
        borderColor: theme.palette.border.dropArea,
        borderRadius: 1,
        transition: "background-color 150ms, border-color 150ms",
        position: "relative",
        px: 2,
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

      <Box sx={contentSx}>
        {!isDragging && (
          <label htmlFor="drop-area-file-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadFileIcon />}
              sx={{ textTransform: "none" }}
              size="small"
            >
              UPLOAD FILE
            </Button>
          </label>
        )}

        <Typography
          variant="body2"
          color={isDragging ? "primary" : "text.secondary"}
        >
          {isDragging ? "Drop file to upload" : "or drag and drop"}
        </Typography>
      </Box>

      <Box sx={{ mt: 1, textAlign: "center" }}>
        {descriptionTop ? (
          <Typography variant="caption" color="text.secondary">
            {descriptionTop}
          </Typography>
        ) : null}
        {descriptionBottom ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block" }}
          >
            {descriptionBottom}
          </Typography>
        ) : null}

        {error ? (
          <Typography
            variant="caption"
            color="error"
            sx={{ display: "block", mt: 0.5 }}
          >
            {error}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
};

export default DropArea;
