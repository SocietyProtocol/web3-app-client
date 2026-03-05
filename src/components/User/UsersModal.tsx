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
import { ReactNode, useState } from "react";
import { Hex } from "viem";
import { truncateAddress } from "@/utils/string";
import { UserCard } from "./UserCard";
import { UserData } from "@/data/users/types";

interface UsersModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  users: Pick<UserData, "id" | "name" | "bio" | "imageUrl">[];
  noUsersFoundText?: string;
  highlightYou?: boolean;
  link?: boolean;
}

export const UsersModal = ({
  open,
  onClose,
  title,
  users,
  noUsersFoundText = "No users found",
  highlightYou = false,
  link = true,
}: UsersModalProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="users-modal-title">
      <DialogTitle id="users-modal-title">
        <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
          {title}
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
          {users.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 200,
              }}
            >
              <Typography variant="body1" color="text.primary">
                {noUsersFoundText}
              </Typography>
            </Box>
          ) : (
            <Gallery
              items={users}
              renderItem={(user) => (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <UserCard
                    id={user.id as Hex}
                    name={user.name ?? truncateAddress(user.id as Hex)}
                    bio={user.bio}
                    imageUrl={user.imageUrl}
                    size="small"
                    highlightYou={highlightYou}
                    link={link}
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
