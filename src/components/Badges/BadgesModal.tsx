import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { BadgeCard } from "./BadgeCard";
import { Gallery } from "../Gallery/Gallery";
import { useState } from "react";
import { BadgeData } from "./types";

interface BadgesModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
  badges: BadgeData[];
}

export const BadgesModal = ({
  open,
  onClose,
  username,
  badges,
}: BadgesModalProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
          All Badges held by {username} ({badges.length})
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          color="primary"
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack
          sx={{
            justifyContent: "space-between",
            width: {
              xs: "auto",
              sm: "fit-content",
            },
            minWidth: 600,
          }}
        >
          {badges.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 200,
              }}
            >
              <Typography variant="body1" color="text.primary">
                No badges found
              </Typography>
            </Box>
          ) : (
            <Gallery
              items={badges}
              renderItem={(badge) => <BadgeCard {...badge} />}
              columns={{
                xs: 1,
                sm: 2,
                md: 3,
              }}
              rows={{
                xs: 2,
                sm: 3,
              }}
              currentPage={currentPage}
              onPageChange={(page) => setCurrentPage(page)}
            />
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
