import { IconButton, Tooltip } from "@mui/material";
import { useCallback, useState } from "react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

interface CopyButtonProps {
  textToCopy: string;
  size?: "small" | "medium";
  tooltipText?: string;
}

export const CopyButton = ({
  textToCopy,
  size = "medium",
  tooltipText,
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  }, [textToCopy]);

  return (
    <Tooltip title={copied ? "Copied!" : tooltipText}>
      <IconButton
        size="small"
        onClick={handleCopy}
        disabled={copied}
        sx={{
          p: size === "small" ? 0.25 : 0.5,
          color: "text.secondary",
          "&:hover": {
            color: "text.primary",
            opacity: 0.8,
          },
        }}
      >
        {copied ? (
          <CheckIcon
            sx={{
              fontSize: size === "small" ? "0.625rem" : 16,
              color: "success.main",
            }}
          />
        ) : (
          <ContentCopyIcon
            sx={{ fontSize: size === "small" ? "0.625rem" : 16 }}
          />
        )}
      </IconButton>
    </Tooltip>
  );
};
