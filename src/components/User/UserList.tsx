"use client";

import {
  Box,
  Stack,
  Typography,
  Button,
  Skeleton,
  Grid,
  SxProps,
} from "@mui/material";
import { truncateAddress } from "@/utils/string";
import { Hex } from "viem";
import { UserCard } from "../User/UserCard";
import { UsersModal } from "./UsersModal";
import { useState } from "react";
import { User } from "../../../.graphclient";

export interface UserListProps {
  users: Array<Pick<User, "id" | "name" | "imageUrl" | "bio">>;
  loading?: boolean;
  highlightYou?: boolean;
  link?: boolean;
  title: string;
  modalTitle?: string;
  noUsersFoundText?: string;
  viewAllButtonText?: string;
  andMoreText?: (remainingCount: number) => string;
  sx?: SxProps;
}

export const UserList = ({
  users,
  loading = false,
  highlightYou = false,
  link = true,
  title = "Users",
  modalTitle = title,
  noUsersFoundText = "No users found",
  viewAllButtonText = "View All Users",
  andMoreText = (remainingCount: number) =>
    `And ${remainingCount} more users...`,
  sx,
}: UserListProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Box
        sx={{
          ...sx,
          width: "100%",
        }}
      >
        <Stack direction="row" justifyContent="space-between" mb={2}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, width: "100%" }}
            component="h6"
          >
            {title} (
            {loading ? (
              <Skeleton
                variant="text"
                width={20}
                sx={{
                  display: "inline-block",
                }}
              />
            ) : (
              users.length
            )}
            )
          </Typography>
          {users.length > 6 && (
            <Button variant="outlined" size="small" onClick={handleOpenModal}>
              {viewAllButtonText}
            </Button>
          )}
        </Stack>

        <Stack
          direction="row"
          justifyContent="flex-start"
          flexWrap="wrap"
          gap={2}
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Grid
                key={`skeleton-${index}`}
                size={1}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <UserCard loading size="small" />
              </Grid>
            ))
          ) : users.length === 0 ? (
            <Stack
              justifyContent="center"
              alignItems="center"
              minHeight={100}
              width="100%"
            >
              <Typography variant="body1" color="text.secondary">
                {noUsersFoundText}
              </Typography>
            </Stack>
          ) : (
            users.slice(0, 6).map((user) => (
              <Box
                key={user.id}
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
            ))
          )}

          {users.length > 6 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                color="text.primary"
                sx={{ textAlign: "center" }}
              >
                {andMoreText(users.length - 6)}
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>

      <UsersModal
        title={modalTitle}
        open={isModalOpen}
        onClose={handleCloseModal}
        users={users}
        noUsersFoundText={noUsersFoundText}
        highlightYou={highlightYou}
        link={link}
      />
    </>
  );
};
