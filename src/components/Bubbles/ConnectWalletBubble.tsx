import { Typography } from "@mui/material";
import { ConnectButton } from "../Wallet/ConnectButton";
import { useAccount } from "wagmi";
import { BubbleBase } from "./BubbleBase";
import { useWagmiReady } from "@/atoms/wagmiReady";

export const ConnectWalletBubble = () => {
  const ready = useWagmiReady();
  const { isConnected } = useAccount();

  return (
    <BubbleBase
      actions={<ConnectButton variant="contained" fullWidth />}
      show={ready && !isConnected}
    >
      <Typography variant="h5" gutterBottom>
        Society Protocol is a framework for building synchronized network
        states.
      </Typography>
    </BubbleBase>
  );
};
