import { Box, Divider, Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import Image from "next/image";

const StyledFooter = styled(Box)(({ theme }) => ({
  width: "100%",
  padding: theme.spacing(0, 2),
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid #ffffff14`,
  position: "relative",
  flex: "0 0 auto",
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(0, 4),
  },
  [theme.breakpoints.up("md")]: {
    padding: theme.spacing(0, 8),
  },
  [theme.breakpoints.up("lg")]: {
    padding: theme.spacing(0, 20),
  },
}));

export const Footer = () => {
  return (
    <StyledFooter>
      <Stack direction="column" justifyContent="center" spacing={0}>
        <Stack
          direction="row"
          paddingY={{ xs: 2, md: 3 }}
          justifyContent={{ xs: "center", sm: "flex-start" }}
        >
          <Image
            src="/logo/logo-dark.svg"
            alt="Society Protocol Logo"
            width={233}
            height={32}
            priority
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
      </Stack>
      <Divider />
      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
        paddingY={{ xs: 2, md: 3 }}
        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
      >
        Society Protocol {new Date().getFullYear()}
      </Typography>
    </StyledFooter>
  );
};
