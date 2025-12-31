import { Box, Stack, Typography, Button, TextField } from "@mui/material";
import { useProfile } from "./useProfile";
import { useEffect } from "react";
import { useUpdateProfile } from "./useUpdateProfile";
import { AvatarInput } from "./AvatarInput";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { useAccountSetup } from "./AccountSetupContext";

interface AccountDetailsEditProps {
  onCancel: () => void;
  onSave: () => void;
}

export const AccountDetailsEdit = ({
  onCancel,
  onSave,
}: AccountDetailsEditProps) => {
  const { profileData, refetch } = useProfile();
  const { data: profile, isLoading } = profileData;
  const {
    createProfile,
    isMutating,
    isTransactionPending,
    isTransactionConfirmed,
  } = useUpdateProfile();

  const { avatar, name, bio, setAvatar, setName, setBio } = useAccountSetup();

  const hasChanges =
    name !== (profile?.name || "") ||
    bio !== (profile?.bio || "") ||
    avatar !== (profile?.avatar || null);

  // Watch for transaction confirmation
  useEffect(() => {
    if (isTransactionConfirmed) {
      // Transaction confirmed, refetch profile data
      refetch().then(() => {
        onSave();
      });
    }
  }, [isTransactionConfirmed, refetch, onSave]);

  const handleCancelClick = () => {
    onCancel();
  };

  const handleSaveClick = async () => {
    try {
      await createProfile({
        name,
        bio,
        avatar,
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const disabled = isMutating || isTransactionPending || isLoading;

  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      {/* Header with Edit Button */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={{ xs: 1.5, sm: 0 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Account Details
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            startIcon={<SaveIcon />}
            onClick={handleSaveClick}
            variant="contained"
            size="small"
            disabled={disabled || !hasChanges}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            {isTransactionPending
              ? "Confirming..."
              : isMutating
              ? "Saving..."
              : "Save"}
          </Button>
          <Button
            startIcon={<CancelIcon />}
            onClick={handleCancelClick}
            variant="outlined"
            size="small"
            disabled={disabled}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            Cancel
          </Button>
        </Stack>
      </Stack>

      {/* Avatar and Name Section */}

      <AvatarInput value={avatar} onChange={setAvatar} disabled={disabled} />
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        fullWidth
        required
        disabled={disabled}
      />

      {/* Bio Section */}
      <Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1, fontWeight: 600 }}
        >
          Bio
        </Typography>

        <TextField
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          fullWidth
          multiline
          rows={4}
          disabled={disabled}
        />
      </Box>
    </Stack>
  );
};
