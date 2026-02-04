import { useExplorerLinkBuilder } from "@/hooks/useExplorerLinkBuilder";
import { IconButton, Tooltip, Typography } from "@mui/material";
import Link from "next/link";
import { useMemo } from "react";
import { Hex } from "viem";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export interface TransactionFeedbackProps {
  hash?: Hex;
  status?: "success" | "reverted";
  successMessage?: string;
  errorMessage?: string;
}

export const TransactionFeedback = ({
  hash,
  status,
  successMessage = "Transaction successful!",
  errorMessage = "Transaction failed. Please try again.",
}: TransactionFeedbackProps) => {
  const buildExplorerLink = useExplorerLinkBuilder();

  const explorerUrl = useMemo(() => {
    if (!hash) return undefined;

    return buildExplorerLink({ tx: hash });
  }, [buildExplorerLink, hash]);

  if (!status || !hash) {
    return null;
  }

  return (
    <Typography
      variant="body2"
      color={status === "success" ? "textPrimary" : "error"}
      align="center"
    >
      {status === "success" ? successMessage : errorMessage}{" "}
      {explorerUrl && (
        <Tooltip title="View on Block Explorer">
          <IconButton
            size="small"
            component={Link}
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              p: 0.5,
              color: "text.primary",
            }}
          >
            <OpenInNewIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Typography>
  );
};
