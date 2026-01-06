import { Stack, Tooltip, Typography } from "@mui/material";
import { ReactNode } from "react";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";

interface DataItemProps {
  label: string;
  children: ReactNode;
  tooltip?: string;
}

export const DataItem = ({ label, children, tooltip }: DataItemProps) => {
  return (
    <Stack
      spacing={2}
      sx={{
        width: "100%",
      }}
    >
      <Typography
        component="div"
        variant="subtitle2"
        gutterBottom
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
          color: "text.label",
        }}
      >
        {label}{" "}
        {tooltip && (
          <Tooltip title={tooltip} arrow placement="top">
            <InfoOutlineIcon style={{ cursor: "help", fontSize: 16 }} />
          </Tooltip>
        )}
      </Typography>
      {children}
    </Stack>
  );
};
