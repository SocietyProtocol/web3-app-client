import { Grid, Skeleton, Typography } from "@mui/material";
import { WithTooltip } from "../WithTooltip/WithTooltip";
interface AccountStatProps {
  label: string;
  value?: string | number;
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
        {loading ? <Skeleton variant="text" width={40} /> : value}
      </Typography>
    </Grid>
  );
};
