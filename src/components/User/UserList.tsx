"use client";

import { SxProps, Theme } from "@mui/material";
import { truncateAddress } from "@/utils/string";
import { Hex } from "viem";
import { UserCard } from "../User/UserCard";
import { UsersModal } from "./UsersModal";
import { ReactNode, useState } from "react";
import { User } from "../../../.graphclient";
import { mergeSx } from "@/utils/sx";
import { CardRow } from "../Cards/CardRow";

export interface UserListProps {
  users: Array<Pick<User, "id" | "name" | "imageUrl" | "bio">>;
  loading?: boolean;
  title: ReactNode;
  modalTitle?: ReactNode;
  noUsersFoundText?: string;
  viewAllButtonText?: string;
  andMoreText?: string;
  sx?: SxProps<Theme>;
}

export const UserList = ({
  users,
  loading = false,
  title = "Users",
  modalTitle = title,
  noUsersFoundText = "No users found",
  viewAllButtonText = "View All Users",
  andMoreText = "And {count} more...",
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
      <CardRow
        sx={mergeSx(
          {
            width: "100%",
          },
          sx,
        )}
        title={title}
        loading={loading}
        items={users}
        minItemWidth={140}
        renderItem={({ loading, ...user }) => (
          <UserCard
            id={user.id as Hex}
            name={user.name ?? truncateAddress(user.id as Hex)}
            bio={user.bio}
            imageUrl={user.imageUrl}
            loading={loading}
            size="small"
            highlightYou
            link
          />
        )}
        andMoreText={andMoreText}
        noneFoundText={noUsersFoundText}
        viewAllText={viewAllButtonText}
        viewAllOnClick={handleOpenModal}
      />

      <UsersModal
        title={modalTitle}
        open={isModalOpen}
        onClose={handleCloseModal}
        users={users}
        noUsersFoundText={noUsersFoundText}
        highlightYou
        link
      />
    </>
  );
};
