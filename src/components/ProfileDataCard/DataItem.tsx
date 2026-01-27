import { Stack } from "@mui/material";
import { ReactNode } from "react";
import { WithTooltip } from "../WithTooltip/WithTooltip";

interface DataItemProps {
  label: string;
  children: ReactNode;
  tooltip?: string;
}

export const DataItem = ({ label, children, tooltip }: DataItemProps) => {
  return (
    <Stack
      spacing={1}
      sx={{
        width: "100%",
      }}
    >
      <WithTooltip
        component="div"
        variant="subtitle2"
        gutterBottom
        color="textPrimary"
        tooltip={tooltip}
        iconPosition="end"
      >
        {label}
      </WithTooltip>
      {children}
    </Stack>
  );
};
