import { Skeleton, Stack } from "@mui/material";
import { ReactNode } from "react";
import { WithTooltip } from "../WithTooltip/WithTooltip";

interface DataItemProps {
  label: string;
  children?: ReactNode;
  tooltip?: string;
  loading?: boolean;
}

export const DataItem = ({
  label,
  children,
  tooltip,
  loading,
}: DataItemProps) => {
  return (
    <Stack
      spacing={1}
      sx={{
        width: "100%",
      }}
    >
      {loading ? (
        <>
          <Skeleton variant="text" width={150} />
          {children}
        </>
      ) : (
        <>
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
        </>
      )}
    </Stack>
  );
};
