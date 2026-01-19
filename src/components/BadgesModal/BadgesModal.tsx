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

  // Transform badges to ensure they have required id
  const badgesWithId = badges.map((badge, index) => ({
    ...badge,
    id: badge.id || `badge-${index}`,
  }));

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
          All Badges held by {username} ({badgesWithId.length})
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
          {badgesWithId.length === 0 ? (
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
              items={badgesWithId}
              renderItem={(badge) => <BadgeCard {...badge} />}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              columns={{
                xs: 1,
                sm: 2,
                md: 3,
              }}
              rows={{
                xs: 2,
                sm: 3,
              }}
            />
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
