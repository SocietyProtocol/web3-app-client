import { Box, Stack, Typography, TextField } from "@mui/material";
import { useAccount } from "wagmi";
import { AvatarInput } from "./AvatarInput";
import { truncateAddress } from "@/utils/string";
import { useAccountSetup } from "./AccountSetupContext";

export const AccountInfoStep = () => {
  const { name, setName, bio, setBio, avatar, setAvatar } = useAccountSetup();
  const { address } = useAccount();

  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      {/* Account Details Header */}
      <Typography variant="h6" sx={{ fontWeight: 500 }}>
        Account details {address && truncateAddress(address)}
      </Typography>

      {/* Avatar Section */}
      <AvatarInput value={avatar} onChange={setAvatar} />

      {/* Name Field */}
      <Box>
        <Typography
          variant="body1"
          sx={{ mb: { xs: 1, sm: 2 }, fontWeight: 500 }}
        >
          Choose a name
        </Typography>
        <TextField
          fullWidth
          placeholder="Name / Nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Box>

      {/* Bio Field */}
      <Box>
        <Typography
          variant="body1"
          sx={{ mb: { xs: 1, sm: 2 }, fontWeight: 500 }}
        >
          Write a short bio
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="Tell us more about you."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </Box>
    </Stack>
  );
};
