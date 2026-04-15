import { Box, List, ListItem, Stack, Typography } from "@mui/material";

const tokenomicsItems = [
  {
    title: "Fairness",
    body: "Each participant in society should retain status / value equal to their contribution to society, at each point in time.",
  },
  {
    title: "Alignment",
    body: "There are two inherently competing interests which must both be balanced and aligned: the individual desire and the societal interest.",
    note: "The goal of alignment is to make it such that each individual's optimal game theoretic move is the same as the optimal move for the society as a whole.",
  },
  {
    title: "Agency",
    body: "We believe that agency and decentralization of control enables more potential actions for every individual, increasing human potential.",
  },
];

export const SpecTokenContent = () => (
  <Stack
    spacing={8}
    sx={{
      maxWidth: 760,
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingX: { xs: 2, md: 8 },
    }}
  >
    {/* Think, share and vote */}
    <Box component="section" aria-labelledby="think-share-vote-heading">
      <Typography
        id="think-share-vote-heading"
        variant="h5"
        component="h2"
        color="primary.main"
        sx={{ mb: 2 }}
      >
        Think, share and vote.
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Build your own society with modular governance, automated trust, and
        sybil-resistant identities. The protocol works like a civic operating
        system: communities, currencies, laws, and membership—defined in code.
      </Typography>
    </Box>

    {/* Tokenomics & governance */}
    <Box component="section" aria-labelledby="tokenomics-governance-heading">
      <Typography
        id="tokenomics-governance-heading"
        variant="h5"
        component="h2"
        color="primary.main"
        sx={{ mb: 3 }}
      >
        Tokenomics &amp; governance
      </Typography>
      <List
        disablePadding
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        {tokenomicsItems.map(({ title, body, note }) => (
          <ListItem
            key={title}
            disableGutters
            alignItems="flex-start"
            sx={{ gap: 2 }}
          >
            <Box
              aria-hidden
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "primary.main",
                flexShrink: 0,
                mt: "10px",
              }}
            />
            <Stack spacing={1}>
              <Typography
                variant="body1"
                component="span"
                sx={{ fontWeight: 600 }}
                color="text.primary"
              >
                {title}:&nbsp;
                <Typography
                  variant="body1"
                  component="span"
                  color="text.secondary"
                  sx={{ fontWeight: 400 }}
                >
                  {body}
                </Typography>
              </Typography>
              {note && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ pl: 0 }}
                >
                  {note}
                </Typography>
              )}
            </Stack>
          </ListItem>
        ))}
      </List>
    </Box>
  </Stack>
);
