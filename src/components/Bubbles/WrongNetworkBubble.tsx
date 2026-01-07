import React from "react";
import { Typography, Button } from "@mui/material";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { BubbleBase } from "./BubbleBase";
import { useAccount } from "wagmi";

export const WrongNetworkBubble: React.FC = () => {
  const { isConnected } = useAccount();
  const { expectedNetwork, isWrongNetwork, switchChain, isSwitching } =
    useCheckWrongNetwork();

  return (
    <BubbleBase
      show={isConnected && isWrongNetwork}
      variant="warning"
      actions={
        <Button
          onClick={() => switchChain?.({ chainId: expectedNetwork.id })}
          disabled={isSwitching}
          variant="contained"
          fullWidth
        >
          {isSwitching ? "Switching..." : `Switch to ${expectedNetwork.name}`}
        </Button>
      }
    >
      <Typography variant="h5" gutterBottom>
        You are connected to the wrong network.
      </Typography>
      <Typography variant="h6" gutterBottom>
        Please switch to <strong>{expectedNetwork.name}</strong> to continue.
      </Typography>
    </BubbleBase>
  );
};
