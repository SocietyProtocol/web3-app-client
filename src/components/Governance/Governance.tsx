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
            sx={{ maxWidth: 980, "& p, & li": { color: "text.primary" } }}
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
          <Box sx={{ width: { xs: "100%", md: "auto" }, minWidth: { md: 300 } }}>
            <BubbleBase
              variant="none"
              sx={{
                "& .MuiCardHeader-root": { padding: 2 },
                "& > .MuiCardContent-root": { padding: 2 },
                "& > .MuiCardActions-root": { padding: 2 },
              }}
              actions={
                <Button
                  variant="contained"
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    whiteSpace: "nowrap",
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
          <Box sx={{ width: { xs: "100%", md: "auto" }, minWidth: { md: 300 } }}>
            <BubbleBase
              variant="none"
              sx={{
                "& .MuiCardHeader-root": { padding: 2 },
                "& > .MuiCardContent-root": { padding: 2 },
                "& > .MuiCardActions-root": { padding: 2 },
              }}
              actions={
                <Button
                  variant="outlined"
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    whiteSpace: "nowrap",
                  }}
                  href={env.snapshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  SPEC Token Snapshot →
                </Button>
              }
            >
              <Typography
                variant="h5"
                sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
              >
                Expression of Feedback
              </Typography>
            </BubbleBase>
          </Box>
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
