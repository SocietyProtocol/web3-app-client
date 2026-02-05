"use client";

import { Box, Button, Typography } from "@mui/material";
import { BubbleBase } from "../Bubbles/BubbleBase";

export const Governance = () => {
  return (
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
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: (theme) => theme.palette.primary[100],
            }}
          >
            Think, share and vote.
          </Typography>
          <Typography
            sx={{
              fontSize: "1.25rem",
              fontWeight: 400,
              color: (theme) => theme.palette.text.secondary,
            }}
          >
            Build your own society with modular governance, automated trust, and
            sybil-resistant identities. The protocol works like a civic
            operating system: communities, currencies, laws, and
            membership—defined in code.
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Typography
            sx={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: (theme) => theme.palette.primary[100],
            }}
          >
            Tokenomics & governance
          </Typography>
          <Typography
            component="ol"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 400,
              color: (theme) => theme.palette.primary.main,
              paddingLeft: (theme) => theme.spacing(2),
            }}
          >
            <li>
              Fairness: Each participant in society should retain status / value
              equal to their contribution to society, at each point in time.
            </li>
            <li>
              Alignment: There are two inherently competing interests which must
              both be balanced and aligned: the individual desire and the
              societal interest.
              <br />• The goal of alignment is to make it such that each
              individual&apos;s optimal game theoretic move is the same as the
              optimal move for the society as a whole.
            </li>
            <li>
              Agency: We believe that agency and decentralization of control
              enables more potential actions for every individual, increasing
              human potential.
            </li>
          </Typography>
        </Box>
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
              href="https://snapshot.box/"
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
  );
};
