import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Stack,
} from "@mui/material";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Image from "next/image";

export interface BubbleBaseProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
  title?: React.ReactNode;
  show?: boolean;
  variant?: "default" | "warning";
}

export const BubbleBase = ({
  children,
  actions,
  title,
  show = true,
  variant = "default",
}: BubbleBaseProps) => {
  if (!show) {
    return null;
  }

  return (
    <Card
      variant="bubble"
      sx={variant === "warning" ? { borderColor: "warning.light" } : {}}
    >
      <CardHeader
        title={
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              mb: 5.5,
            }}
          >
            {variant === "default" ? (
              <ChatBubbleOutlineOutlinedIcon fontSize="large" />
            ) : (
              <WarningAmberOutlinedIcon
                fontSize="large"
                sx={{ color: "warning.light" }}
              />
            )}
            {title || ""}
            <Image
              src="/logo/logo-icon-dark.svg"
              alt="Society Protocol Logo"
              width={32}
              height={32}
              priority
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </Stack>
        }
      />

      <CardContent>{children}</CardContent>

      <CardActions>{actions}</CardActions>
    </Card>
  );
};
