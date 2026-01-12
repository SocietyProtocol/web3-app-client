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
import { BadgeCard, BadgeCardProps } from "../BadgeCard/BadgeCard";

import { Gallery } from "../Gallery/Gallery";
import { useEffect, useState } from "react";

interface BadgesModalProps {
  open: boolean;
  onClose: () => void;
  badges: BadgeCardProps[];
  username?: string;
}

export const BadgesModal = ({
  open,
  onClose,
  badges,
  username = "User",
}: BadgesModalProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPage(1);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
          All Badges held by {username} ({badges.length})
        </Typography>
        <IconButton onClick={onClose} size="small" color="primary">
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
              itemWidth={200}
              itemHeight={200}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
