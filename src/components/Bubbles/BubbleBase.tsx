import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Stack,
  SxProps,
  Theme,
} from "@mui/material";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Image from "next/image";
import { mergeSx } from "@/utils/sx";

export interface BubbleBaseProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
  title?: React.ReactNode;
  show?: boolean;
  showIcon?: boolean;
  variant?: "info" | "warning" | "none";
  sx?: SxProps<Theme>;
}

export const BubbleBase = ({
  children,
  actions,
  title,
  show = true,
  showIcon = true,
  variant = "none",
  sx,
}: BubbleBaseProps) => {
  if (!show) {
    return null;
  }

  return (
    <Card
      variant="bubble"
      sx={mergeSx(
        variant === "warning" && { borderColor: "warning.light" },
        sx,
      )}
    >
      <CardHeader
        title={
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              mb: { xs: 2, sm: 5.5 },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{ flex: 1 }}
            >
              {showIcon &&
                (variant === "info" ? (
                  <ChatBubbleOutlineOutlinedIcon fontSize="large" />
                ) : variant === "warning" ? (
                  <WarningAmberOutlinedIcon
                    fontSize="large"
                    sx={{ color: "warning.light" }}
                  />
                ) : null)}

              {title ?? ""}
            </Stack>

            <Image
              src="/logo/logo-icon-dark.svg"
              alt="Society Protocol Logo"
              width={32}
              height={32}
              priority
              style={{ width: "2rem", height: "auto" }}
            />
          </Stack>
        }
      />

      <CardContent>{children}</CardContent>

      <CardActions>{actions}</CardActions>
    </Card>
  );
};
