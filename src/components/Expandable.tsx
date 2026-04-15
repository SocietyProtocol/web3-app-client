"use client";

import { Accordion, AccordionSummary, Box, Typography } from "@mui/material";
import { ReactNode, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

export interface ExpandableProps {
  summary: ReactNode;
  content: ReactNode;
}

export const Expandable = ({ summary, content }: ExpandableProps) => {
  const [expanded, setExpanded] = useState(false);

  const handleChange = () => {
    setExpanded((prev) => !prev);
  };

  return (
    <Accordion
      disableGutters
      elevation={0}
      expanded={expanded}
      onChange={handleChange}
    >
      <AccordionSummary expandIcon={expanded ? <RemoveIcon /> : <AddIcon />}>
        <Typography>{summary}</Typography>
      </AccordionSummary>
      <Box sx={{ padding: 2 }}>{content}</Box>
    </Accordion>
  );
};
