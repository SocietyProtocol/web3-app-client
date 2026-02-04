"use client";

import React from "react";
import { Box, Container, Skeleton, Stack } from "@mui/material";

interface HomeSkeletonProps {
  showBubble?: boolean;
}

export const HomeSkeleton: React.FC<HomeSkeletonProps> = ({
  showBubble = true,
}) => {
  return (
    <Container
      maxWidth="md"
      sx={{
        marginBottom: 6,
        px: { xs: 2, sm: 0 },
      }}
    >
      {showBubble && (
        <Box
          sx={{
            mb: { xs: 3, sm: 4 },
            width: "100%",
            maxWidth: { xs: "100%", sm: 600 },
            mx: "auto",
          }}
        >
          <Stack spacing={1}>
            <Skeleton
              variant="rectangular"
              height={40}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton variant="text" width="60%" sx={{ fontSize: "1rem" }} />
          </Stack>
        </Box>
      )}

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
