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
import { Address } from "viem";
import { truncateAddress } from "@/utils/string";
import { UserCard } from "../User/UserCard";

interface Holder {
  id: string;
}

interface HoldersModalProps {
  open: boolean;
  onClose: () => void;
  badgeName: string;
  holders: Holder[];
}

export const HoldersModal = ({
  open,
  onClose,
  badgeName,
  holders,
}: HoldersModalProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
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
                    id={holder.id as Address}
                    name={truncateAddress(holder.id as Address)}
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
