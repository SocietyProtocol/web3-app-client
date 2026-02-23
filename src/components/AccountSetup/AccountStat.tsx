import { Grid, Skeleton, Typography } from "@mui/material";
import { WithTooltip } from "../WithTooltip/WithTooltip";
import { ReactNode } from "react";
interface AccountStatProps {
  label: string;
  value?: string | number | ReactNode;
  tooltip?: string;
  loading?: boolean;
}

export const AccountStat = ({
  label,
  value,
  tooltip,
  loading,
}: AccountStatProps) => {
  return (
    <Grid
      size={1}
      sx={{
        minWidth: "120px",
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
      {loading ? (
        <Skeleton variant="text" width={40} />
      ) : typeof value === "string" || typeof value === "number" ? (
        <Typography
          component="div"
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: "text.primary",
            fontSize: (theme) => theme.typography.pxToRem(28),
            fontWeight: 500,
          }}
        >
          {value}
        </Typography>
      ) : (
        value
      )}
    </Grid>
  );
};
