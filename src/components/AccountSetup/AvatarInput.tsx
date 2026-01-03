import {
  Stack,
  Typography,
  Button,
  Avatar,
  FormHelperText,
} from "@mui/material";
import { useRef } from "react";
import { useSnackbar } from "notistack";

interface AvatarInputProps {
  value: string | null;
  onChange: (avatar: string | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

export const AvatarInput = ({
  value,
  onChange,
  disabled = false,
  error,
  helperText,
}: AvatarInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { enqueueSnackbar } = useSnackbar();

  const handleUploadPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        onChange(event.target.result);
      }
    };
    reader.onerror = () => {
      enqueueSnackbar("Failed to read image file.", { variant: "error" });
    };
    reader.readAsDataURL(file);
  };

  /*     const handleUseNFT = () => {
      // TODO: Implement NFT selection logic
    };
 */
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 2, sm: 2 }}
      alignItems="flex-start"
    >
      <Avatar
        src={value || "/icons/upload-img.svg"}
        sx={{
          width: { xs: 64, sm: 80 },
          height: { xs: 64, sm: 80 },
          bgcolor: "primary.contrastText",
          borderRadius: 16,
          padding: value ? 0 : { xs: 2, sm: 3 },
          ...(disabled && { opacity: 0.5 }),
          ...(error && {
            border: (theme) => `2px solid ${theme.palette.error.main}`,
          }),
        }}
      />
      <Stack spacing={1.5} sx={{ width: { xs: "100%", sm: "auto" } }}>
        <Typography
          variant="body1"
          sx={{
            mb: { xs: 1, sm: 2 },
            fontWeight: 500,
            textAlign: { xs: "center", sm: "left" },
            ...(disabled && { color: "text.disabled" }),
          }}
        >
          Choose an avatar
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 2 }}
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          <Button
            variant="outlined"
            onClick={handleUploadPhoto}
            size="small"
            disabled={disabled}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Upload photo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          {/* <Button variant="outlined" onClick={handleUseNFT} size="small">
            Use an NFT
          </Button> */}
          <Button
            variant="text"
            onClick={() => onChange(null)}
            size="small"
            disabled={disabled}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Remove Photo
          </Button>
        </Stack>
        {helperText && (
          <FormHelperText
            error={error}
            sx={{ textAlign: { xs: "center", sm: "left" } }}
          >
            {helperText}
          </FormHelperText>
        )}
      </Stack>
    </Stack>
  );
};
