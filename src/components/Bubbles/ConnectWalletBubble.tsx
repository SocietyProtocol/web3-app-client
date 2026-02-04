import { Typography } from "@mui/material";
import { ConnectButton } from "../Wallet/ConnectButton";
import { BubbleBase } from "./BubbleBase";

interface ConnectWalletBubbleProps {
  message?: string;
}

export const ConnectWalletBubble = ({
  message = "Society Protocol is a framework for building synchronized network states.",
}: ConnectWalletBubbleProps) => {
  return (
    <BubbleBase actions={<ConnectButton variant="contained" fullWidth />}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
      >
        {message}
      </Typography>
    </BubbleBase>
  );
};
