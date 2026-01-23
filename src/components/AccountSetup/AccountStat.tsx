import { Grid, Skeleton, Tooltip, Typography } from "@mui/material";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
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
      <Typography
        component="div"
        variant="subtitle2"
        gutterBottom
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: "text.primary",
        }}
      >
        {label}

        {tooltip && (
          <Tooltip title={tooltip} arrow placement="top">
            <InfoOutlineIcon sx={{ cursor: "help", fontSize: 16 }} />
          </Tooltip>
        )}
      </Typography>
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
