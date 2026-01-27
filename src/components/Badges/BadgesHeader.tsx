"use client";
import { Box, Button, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

export const BadgesHeader = () => {
  const router = useRouter();

  const handleCreateBadge = () => {
    router.push("/create-badge");
  };

  return (
    <Box py={3} px={5}>
      <Typography
        sx={{
          fontSize: "1.125rem",
          fontWeight: 700,
          color: (theme) => theme.palette.primary[100],
        }}
      >
        Create Badges and share value
      </Typography>
      <Box display="flex" flexDirection="row" gap={3} mt={1}>
        <Typography
          variant="body1"
          color="text.primary"
          sx={{
            flexShrink: 1,
          }}
        >
          Create your own community with user badges, automated trust, and
          secure identities. The protocol acts as a civic OS, managing
          communities, currencies, and rules through code.
        </Typography>

        <Button
          variant="contained"
          sx={{
            maxWidth: "unset !important",
            whiteSpace: "nowrap",
          }}
          onClick={handleCreateBadge}
        >
          Create Badge
        </Button>
      </Box>
    </Box>
  );
};
