"use client";

import { Box, Button, Typography } from "@mui/material";
import { BubbleBase } from "../Bubbles/BubbleBase";
import { User } from "../../../.graphclient";
import { UserList } from "../User/UserList";
import { env } from "@/lib/env";
import { MarkdownRenderer } from "@/components/MarkdownRenderer/MarkdownRenderer";

export const Governance = () => {
  const governors: Pick<User, "id" | "name" | "imageUrl" | "bio">[] = [];

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 6,
          paddingX: { xs: 2, md: 8 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <MarkdownRenderer
            src="/api/copywriting/governance"
            sx={{ maxWidth: 980 }}
          />
        </Box>
        <Box sx={{ width: { xs: "100%", md: "auto" }, minWidth: { md: 300 } }}>
          <BubbleBase
            variant="none"
            actions={
              <Button
                variant="contained"
                sx={{
                  width: { xs: "100%", sm: "auto" },
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
                href={env.snapshotUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Check Snapshot →
              </Button>
            }
          >
            <Typography
              variant="h5"
              sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
            >
              Governance
            </Typography>
          </BubbleBase>
        </Box>
      </Box>

      <UserList
        title="Governors"
        users={governors}
        noUsersFoundText="No governors found"
        sx={{
          marginTop: 10,
        }}
      />
    </Box>
  );
};
