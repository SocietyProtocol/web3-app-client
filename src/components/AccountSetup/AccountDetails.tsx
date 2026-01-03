import { Box, Paper, Stack, Typography, Button } from "@mui/material";
import { Avatar } from "../Avatar/Avatar";
import { useProfile } from "./useProfile";
import { useAccount } from "wagmi";
import { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import { AccountDetailsEdit } from "./AccountDetailsEdit";
import { AccountSkeleton } from "./AccountSkeleton";
import { AccountSetupProvider } from "./AccountSetupContext";
import { Address } from "../Address/Address";

export const AccountDetails = () => {
  const { address } = useAccount();
  const { profileId, profileData } = useProfile();
  const { data: profile, isLoading } = profileData;

  const [isEditing, setIsEditing] = useState(false);

  const toggleEditing = () => {
    setIsEditing((prev) => !prev);
  };

  if (!profile && isLoading) {
    return <AccountSkeleton />;
  }

  return (
    <Paper
      elevation={1}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        boxShadow: "none",
        overflow: "hidden",
        ...(isEditing && {
          backgroundColor: "background.paper",
          backgroundImage: "none",
        }),
      }}
    >
      {isEditing ? (
        <AccountSetupProvider>
          <AccountDetailsEdit onCancel={toggleEditing} onSave={toggleEditing} />
        </AccountSetupProvider>
      ) : (
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
            <Button
              startIcon={<EditIcon />}
              onClick={toggleEditing}
              variant="outlined"
              size="small"
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              Edit Profile
            </Button>
          </Stack>

          {/* Avatar and Name Section */}
          <Stack
            direction="row"
            spacing={{ xs: 1.5, sm: 2 }}
            alignItems="flex-start"
          >
            <Avatar
              ensImage={profile?.avatar || null}
              address={address}
              size={{ xs: 48, sm: 64 }}
            />
            <Stack spacing={0.5} flex={1} minWidth={0}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: "text.primary",
                  opacity: 0.9,
                  fontSize: { xs: "1rem", sm: "1.25rem" },
                }}
              >
                {profile?.name || `User #${profileId!.data!}`}
              </Typography>
              {address && (
                <Address address={address} showCopy showLink truncate />
              )}
            </Stack>
          </Stack>

          {/* Bio Section */}
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1, fontWeight: 600 }}
            >
              Bio
            </Typography>
            <Typography
              variant="body1"
              sx={{
                whiteSpace: "pre-wrap",
                color: "text.primary",
                opacity: 0.7,
              }}
            >
              {profile?.bio || "No bio added yet."}
            </Typography>
          </Box>

          {/* Referral Code Section */}
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1, fontWeight: 600 }}
            >
              Referral Code
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontFamily: "monospace",
                color: "text.primary",
                opacity: 0.9,
                fontWeight: 500,
              }}
            >
              {profile?.referralCode || "No referral code set."}
            </Typography>
          </Box>
        </Stack>
      )}
    </Paper>
  );
};
