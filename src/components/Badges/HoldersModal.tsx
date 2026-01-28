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
import { Gallery } from "../Gallery/Gallery";
import { useState } from "react";
import { Hex } from "viem";
import { truncateAddress } from "@/utils/string";
import { UserCard } from "../User/UserCard";
import { UserData } from "@/data/users/types";

interface HoldersModalProps {
  open: boolean;
  onClose: () => void;
  badgeName: string;
  holders: Pick<UserData, "id" | "name" | "bio" | "imageUrl">[];
}

export const HoldersModal = ({
  open,
  onClose,
  badgeName,
  holders,
}: HoldersModalProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="holders-modal-title">
      <DialogTitle id="holders-modal-title">
        <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
          All Holders of {badgeName} ({holders.length})
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
          {holders.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 200,
              }}
            >
              <Typography variant="body1" color="text.primary">
                No holders found
              </Typography>
            </Box>
          ) : (
            <Gallery
              items={holders}
              renderItem={(holder) => (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <UserCard
                    id={holder.id as Hex}
                    name={holder.name ?? truncateAddress(holder.id as Hex)}
                    bio={holder.bio}
                    imageUrl={holder.imageUrl}
                    size="small"
                    highlightYou
                    link
                  />
                </Box>
              )}
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
