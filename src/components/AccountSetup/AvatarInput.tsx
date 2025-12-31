import { Stack, Typography, Button, Avatar } from "@mui/material";
import { useRef } from "react";

interface AvatarInputProps {
  value: string | null;
  onChange: (avatar: string | null) => void;
  disabled?: boolean;
}

export const AvatarInput = ({
  value,
  onChange,
  disabled = false,
}: AvatarInputProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === "string") {
          onChange(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  /*     const handleUseNFT = () => {
      // TODO: Implement NFT selection logic
    };
 */
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={{ xs: 2, sm: 2 }}
      alignItems={{ xs: "center", sm: "center" }}
    >
      <Avatar
        src={value || "/icons/upload-img.svg"}
        sx={{
          width: { xs: 64, sm: 80 },
          height: { xs: 64, sm: 80 },
          bgcolor: "primary.contrastText",
          borderRadius: "46px 27px 56px 56px",
          padding: value ? 0 : { xs: 2, sm: 3 },
          ...(disabled && { opacity: 0.5 }),
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
      </Stack>
    </Stack>
  );
};
