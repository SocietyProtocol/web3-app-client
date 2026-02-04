"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
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
import { ConnectWalletBubble } from "@/components/Bubbles/ConnectWalletBubble";
import { AccountSetupBubble } from "@/components/Bubbles/AccountSetupBubble";
import { useAccount } from "wagmi";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";
import { useProfile } from "@/components/AccountSetup/useProfile";
import { WrongNetworkBubble } from "@/components/Bubbles/WrongNetworkBubble";
import { faqData } from "@/data/faq";

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

  const { address, isConnected } = useAccount();
  const { isWrongNetwork } = useCheckWrongNetwork();
  const profile = useProfile(address);

  const router = useRouter();

  const showBubble =
    !isConnected || isWrongNetwork || !profile.profileData.data;

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
            display: "flex",
            flexDirection: "column",
            gap: { xs: 1.5, sm: 2 },
            maxWidth: { xs: "100%", sm: 600 },
            marginX: "auto",
            width: "100%",
          }}
        >
          {!isConnected ? (
            <ConnectWalletBubble message="Society Protocol is a framework for building synchronized network states." />
          ) : isWrongNetwork ? (
            <WrongNetworkBubble />
          ) : (
            !profile.profileData.data && (
              <AccountSetupBubble
                onActionClick={() => router.push("/profile?setupOpen=true")}
              />
            )
          )}
        </Box>
      )}

      <Box
        sx={{ mt: showBubble ? { xs: 6, sm: 10 } : { xs: 3, sm: 5 } }}
        role="region"
        aria-labelledby="faq-heading"
      >
        <Typography
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
              <Typography
                sx={{
                  fontSize: { xs: "1rem", sm: "1.125rem" },
                  fontWeight: 700,
                }}
              >
                {faq.question}
              </Typography>
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
