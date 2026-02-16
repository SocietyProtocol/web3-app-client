"use client";

import React from "react";
import { Box, Container, Skeleton, Stack } from "@mui/material";

export const HomeSkeleton: React.FC = () => {
  return (
    <Container
      maxWidth="md"
      sx={{
        marginBottom: 6,
        px: { xs: 2, sm: 0 },
      }}
    >
      <Box sx={{ mt: { xs: 4, sm: 8 } }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <Skeleton
            variant="text"
            width="40%"
            sx={{ fontSize: { xs: "1.5rem", sm: "2.375rem" } }}
          />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Skeleton
            variant="text"
            width="30%"
            sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}
          />
        </Box>

        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Box
              key={i}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 1,
                background: "transparent",
              }}
            >
              <Skeleton
                variant="text"
                width="50%"
                sx={{ fontSize: { xs: "1rem", sm: "1.125rem" } }}
              />
              <Skeleton
                variant="rectangular"
                height={64}
                sx={{ mt: 1, borderRadius: 1 }}
              />
            </Box>
          ))}
        </Stack>
      </Box>
    </Container>
  );
};

export default HomeSkeleton;
