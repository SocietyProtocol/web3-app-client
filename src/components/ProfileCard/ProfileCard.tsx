import { Box, Paper, Stack, Typography } from "@mui/material";
import { Avatar } from "../Avatar/Avatar";
import { Hex } from "viem";
import { Address } from "../Address/Address";

interface ProfileCardProps {
  avatar: string | null;
  name: string;
  address?: Hex;
  bio: string;
  referralCode?: string;
}

export const ProfileCard = ({
  avatar,
  name,
  address,
  bio,
  referralCode,
}: ProfileCardProps) => {
  return (
    <Paper
      elevation={1}
      sx={{
        px: 1,
        py: 2,
        borderRadius: 2,
        boxShadow: "none",
        minHeight: 200,
        width: {
          xs: "100%",
          sm: "214px",
        },
      }}
    >
      <Stack spacing={1} alignItems="center">
        {/* Avatar and Name Section */}
        <Avatar ensImage={avatar} address={address} size={54} />

        {/* Extra margin */}
        <Box />

        {/* Name */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            opacity: 0.8,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
          title={name}
        >
          {name || `User`}
        </Typography>

        {/* Address */}
        {address && (
          <Address address={address} showCopy truncate showLink size="small" />
        )}

        {/* Extra margin */}
        <Box />

        {/* Bio Section */}
        <Box>
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "pre-wrap",
              px: 1,
              color: "text.primary",
              opacity: 0.6,
            }}
          >
            {bio || "Your bio goes here."}
          </Typography>
        </Box>

        {/* Referral Code Section */}
        {referralCode && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Referral Code
            </Typography>
            <Typography variant="body1">{referralCode}</Typography>
          </Box>
        )}
      </Stack>
    </Paper>
  );
};
