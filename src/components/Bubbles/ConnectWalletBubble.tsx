import { Typography } from "@mui/material";
import { ConnectButton } from "../Wallet/ConnectButton";
import { BubbleBase } from "./BubbleBase";

export const ConnectWalletBubble = () => {
  return (
    <BubbleBase actions={<ConnectButton variant="contained" fullWidth />}>
      <Typography variant="h5" gutterBottom>
        Society Protocol is a framework for building synchronized network
        states.
      </Typography>
    </BubbleBase>
  );
};
