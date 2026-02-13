import React from "react";
import { Typography, Button } from "@mui/material";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { BubbleBase } from "./BubbleBase";
import { useAccount } from "wagmi";

interface WrongNetworkBubbleProps {
  message?: string;
}

export const WrongNetworkBubble: React.FC<WrongNetworkBubbleProps> = ({
  message = "You are connected to the wrong network.",
}) => {
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
      <Typography
        variant="h5"
        gutterBottom
        sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
      >
        {message}
      </Typography>
      <Typography
        variant="h6"
        gutterBottom
        sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
      >
        Please switch to <strong>{expectedNetwork.name}</strong> to continue.
      </Typography>
    </BubbleBase>
  );
};
