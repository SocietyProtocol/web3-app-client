"use client";

import React, { useCallback, useState } from "react";
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useAccount } from "wagmi";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { useProfile } from "@/components/AccountSetup/useProfile";
import { faqData } from "@/data/faq";
import HomeSkeleton from "@/components/Skeletons/HomeSkeleton";
import { useWagmiReady } from "@/atoms/wagmiReady";
import { ContentGuard } from "@/components/Bubbles/ContentGuard";

export default function Home() {
  // allow multiple panels to be expanded
  const [expandedPanels, setExpandedPanels] = useState<number[]>([]);

  const handleToggle = useCallback(
    (panel: number) => (_event: React.SyntheticEvent, isExpanded: boolean) =>
      setExpandedPanels((prev) => {
        if (isExpanded) {
          return [...prev, panel];
        }
        return prev.filter((p) => p !== panel);
      }),
    [],
  );
  const wagmiReady = useWagmiReady();

  const { address, isConnected } = useAccount();
  const { isWrongNetwork } = useCheckWrongNetwork();
  const profile = useProfile(address);

  const isInitialLoading =
    (profile.profileId.data === undefined && profile.profileId.isLoading) ||
    (profile.uri.data === undefined && profile.uri.isLoading) ||
    (profile.profileData.data === undefined && profile.profileData.isLoading);

  const showBubble =
    !isConnected || isWrongNetwork || !profile.profileData.data;

  if (!wagmiReady || isInitialLoading) {
    return <HomeSkeleton showBubble={showBubble} />;
  }

  return (
    <Container
      maxWidth="md"
      sx={{
        marginBottom: 6,
        px: { xs: 2, sm: 0 },
      }}
    >
      <ContentGuard
        requireNetwork
        requireAccount
        connectWalletMessage="Society Protocol is a framework for building synchronized network states."
      />

      <Box
        sx={{ mt: showBubble ? { xs: 6, sm: 10 } : { xs: 3, sm: 5 } }}
        role="region"
        aria-labelledby="faq-heading"
      >
        <Typography
          id="faq-heading"
          variant="h4"
          gutterBottom
          sx={{
            textAlign: "center",
            color: (theme) => theme.palette.primary[100],
            fontSize: { xs: "1.5rem", sm: "2.375rem" },
          }}
        >
          Common questions
        </Typography>

        <Typography
          variant="body1"
          sx={{
            textAlign: "center",
            mb: 4,
            color: (theme) => theme.palette.primary.main,
            fontSize: { xs: "0.9rem", sm: "1rem" },
          }}
        >
          Here&apos;s a quick overview of Society Protocol
        </Typography>

        {faqData.map((faq) => (
          <Accordion
            key={faq.id}
            expanded={expandedPanels.includes(faq.id)}
            onChange={handleToggle(faq.id)}
          >
            <AccordionSummary
              expandIcon={
                expandedPanels.includes(faq.id) ? <RemoveIcon /> : <AddIcon />
              }
            >
              <Typography>{faq.question}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {Array.isArray(faq.answer) ? (
                <ol>
                  {faq.answer.map((item, index) => (
                    <Typography
                      key={index}
                      sx={{ mb: 2, fontSize: { xs: "0.875rem", sm: "1rem" } }}
                      component="li"
                    >
                      {item.split("\n").length > 1
                        ? item.split("\n").map((line, lineIndex, lines) => (
                            <React.Fragment key={lineIndex}>
                              {"• "}
                              {line}
                              {lineIndex < lines.length - 1 && <br />}
                            </React.Fragment>
                          ))
                        : item}
                    </Typography>
                  ))}
                </ol>
              ) : (
                <Typography
                  sx={{ mb: 2, fontSize: { xs: "0.875rem", sm: "1rem" } }}
                >
                  {faq.answer}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Container>
  );
}
