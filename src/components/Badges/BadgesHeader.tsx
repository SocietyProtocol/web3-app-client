"use client";
import { Box, Button, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

export const BadgesHeader = () => {
  const router = useRouter();

  const handleCreateBadge = () => {
    router.push("/create-badge");
  };

  return (
    <Box>
      <Typography
        sx={{
          fontSize: "1.125rem",
          fontWeight: 700,
          color: (theme) => theme.palette.primary[100],
        }}
      >
        Create Badges and share value
      </Typography>
      <Box
        display="flex"
        flexDirection="row"
        gap={{
          xs: 3,
          sm: 6,
        }}
        mt={1}
        justifyContent="space-between"
        width="100%"
        flexWrap="wrap"
      >
        <Typography
          variant="body1"
          color="text.primary"
          sx={{
            flexBasis: {
              xs: "100%",
              sm: "60%",
              md: "70%",
            },
          }}
        >
          Create your own community with user badges, automated trust, and
          secure identities. The protocol acts as a civic OS, managing
          communities, currencies, and rules through code.
        </Typography>

        <Button
          variant="contained"
          sx={{
            maxWidth: { xs: "100% !important", sm: "200px !important" },
            whiteSpace: "nowrap",
            minWidth: "154px !important",
            flex: 1,
          }}
          onClick={handleCreateBadge}
        >
          Create Badge
        </Button>
      </Box>
    </Box>
  );
};
