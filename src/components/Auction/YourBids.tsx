"use client";

import { mockYourBids } from "@/data/your-bids";
import {
  Box,
  Paper,
  styled,
  Typography,
  Tooltip,
  IconButton,
  Button,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { TokenIcon } from "@/components/TokenIcon/TokenIcon";

const Tr = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 60px",
  padding: theme.spacing(2, 1),
  alignItems: "center",
  gap: theme.spacing(1),
  [theme.breakpoints.down("md")]: {
    gridTemplateColumns: "1fr",
    gap: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.border.area}`,
  },
  [theme.breakpoints.down("sm")]: {
    gap: theme.spacing(1),
  },
}));

const HeaderCell = ({ label, tooltip }: { label: string; tooltip: string }) => (
  <Box
    sx={{
      display: { xs: "none", md: "flex" },
      alignItems: "center",
      gap: 0.5,
    }}
  >
    <Typography
      sx={{
        fontSize: "12px",
        fontWeight: 400,
        color: "text.primary",
        textTransform: "uppercase",
      }}
    >
      {label}
    </Typography>
    <Tooltip title={tooltip} arrow placement="top">
      <IconButton size="small" sx={{ padding: 0 }}>
        <InfoOutlinedIcon sx={{ fontSize: "14px", color: "text.primary" }} />
      </IconButton>
    </Tooltip>
  </Box>
);

const Status = styled(Typography)<{
  status: "Placed" | "Pending" | "Cancelled";
}>(({ theme, status }) => ({
  fontSize: "14px",
  fontWeight: 700,
  color:
    status === "Placed"
      ? theme.palette.success.light
      : status === "Pending"
      ? theme.palette.warning.light
      : theme.palette.error.light,
}));

export const YourBids = () => {
  return (
    <Paper
      elevation={0}
      sx={{
        padding: {
          xs: 0,
          md: "24px 40px",
          lg: "24px 80px",
        },
        backgroundColor: "transparent",
        border: (theme) => `1px solid ${theme.palette.border.area}`,
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        position: "relative",
        overflowX: "auto",
      }}
    >
      {mockYourBids.length === 0 ? (
        <Typography
          sx={{
            padding: (theme) => ({
              xs: theme.spacing(4, 0),
              md: theme.spacing(10, 0),
            }),
            textAlign: "center",
            color: "text.secondary",
          }}
        >
          No bids found.
        </Typography>
      ) : (
        <>
          <Tr
            sx={{
              display: { xs: "none", md: "grid" },
            }}
          >
            <HeaderCell
              label="Amount"
              tooltip="The amount of tokens in your bid"
            />
            <HeaderCell
              label="Limit Price"
              tooltip="The maximum price per token"
            />
            <HeaderCell label="Status" tooltip="Current status of your bid" />
            <Box />
          </Tr>

          {mockYourBids.map((bid) => (
            <Tr key={bid.id}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography
                  sx={{
                    display: { xs: "block", md: "none" },
                    fontSize: "10px",
                    fontWeight: 400,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    mb: 0.5,
                  }}
                >
                  Amount
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TokenIcon symbol={bid.tokenSymbol} size={24} />
                  <Typography fontWeight={700}>
                    {bid.amount} {bid.tokenSymbol}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",

                  gap: { xs: 0.5, md: 0 },
                }}
              >
                <Typography
                  sx={{
                    display: { xs: "block", md: "none" },
                    fontSize: "10px",
                    fontWeight: 400,
                    color: "text.secondary",
                    textTransform: "uppercase",
                  }}
                >
                  Limit Price
                </Typography>
                <Typography fontWeight={700}>
                  {bid.price} {bid.tokenSymbol} per SPEC
                </Typography>
              </Box>
              <Box
                sx={{
                  display: { xs: "flex", md: "block" },
                  flexDirection: "column",
                  alignItems: "center",
                  gap: { xs: 0.5, md: 0 },
                }}
              >
                <Typography
                  sx={{
                    display: { xs: "block", md: "none" },
                    fontSize: "10px",
                    fontWeight: 400,
                    color: "text.secondary",
                    textTransform: "uppercase",
                  }}
                >
                  Status
                </Typography>
                <Status status={bid.status}>{bid.status}</Status>
              </Box>
              <Box
                sx={{
                  display: { xs: "flex", md: "block" },
                  gridColumn: { xs: "1", md: "auto" },
                  justifyContent: "center",
                }}
              >
                {(bid.status === "Placed" || bid.status === "Pending") && (
                  <Button
                    size="small"
                    variant="contained"
                    sx={{
                      width: { xs: "100%", sm: "200px", md: "auto" },
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            </Tr>
          ))}
        </>
      )}
    </Paper>
  );
};
