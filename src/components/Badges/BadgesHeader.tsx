"use client";
import { Box, Button, Link, Stack, Typography } from "@mui/material";
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
        Browse on-chain badges
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
            flex: { xs: "1 1 100%", sm: "0 1 auto" },
            maxWidth: { sm: 360, md: 460 },
          }}
        >
          Verifiable credentials of role, status and membership across Society
          Protocol — Official, Community or Individual.
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={{ xs: 2, sm: 4 }}
          sx={{ flexShrink: 0 }}
        >
          <Link
            href="/badges-faq"
            style={{
              textDecoration: "underline",
              fontSize: "1rem",
              whiteSpace: "nowrap",
            }}
          >
            Learn more about Badges
          </Link>
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
        </Stack>
      </Box>
    </Box>
  );
};
