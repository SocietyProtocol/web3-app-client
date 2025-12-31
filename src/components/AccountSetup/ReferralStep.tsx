import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useAccount, useDisconnect } from "wagmi";
import { useAccountSetup } from "./AccountSetupContext";
import { Address } from "../Address/Address";
import { useIsMobile } from "@/hooks/useIsMobile";

export const ReferralStep = () => {
  const { referralCode, setReferralCode } = useAccountSetup();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const isMobile = useIsMobile();
  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      {/* Account Info */}
      <Box>
        <Typography
          variant="body1"
          sx={{ mb: { xs: 1, sm: 2 }, fontWeight: 500 }}
        >
          Account info for this address:
        </Typography>
        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ minWidth: 0 }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Address address={address!} showCopy showLink truncate={isMobile} />
          </Box>

          <Button
            size="small"
            variant="outlined"
            onClick={() => disconnect()}
            sx={{
              width: { xs: "100%", sm: "auto" },
              flexShrink: 0,
            }}
          >
            Disconnect
          </Button>
        </Stack>
      </Box>

      {/* Spacing */}
      <Box sx={{ height: { xs: 16, sm: 24 } }} />

      {/* Referral Code */}
      <Box>
        <Typography variant="body1" sx={{ mb: { xs: 1, sm: 2 } }}>
          Did someone invite you?{" "}
          <Typography component="span" variant="body1" color="text.secondary">
            (OPTIONAL)
          </Typography>
        </Typography>
        <TextField
          fullWidth
          placeholder="Enter your referral code"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
        />
      </Box>
    </Stack>
  );
};
