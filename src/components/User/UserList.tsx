"use client";

import { SxProps } from "@mui/material";
import { truncateAddress } from "@/utils/string";
import { Hex } from "viem";
import { UserCard } from "../User/UserCard";
import { UsersModal } from "./UsersModal";
import { ReactNode, useState } from "react";
import { User } from "../../../.graphclient";
import { CardRow } from "../Cards/CardRow";

export interface UserListProps {
  users: Array<Pick<User, "id" | "name" | "imageUrl" | "bio">>;
  loading?: boolean;
  link?: boolean;
  title: ReactNode;
  modalTitle?: ReactNode;
  noUsersFoundText?: string;
  viewAllButtonText?: string;
  andMoreText?: string;
  sx?: SxProps;
}

export const UserList = ({
  users,
  loading = false,
  link = true,
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
        sx={[
          {
            width: "100%",
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        title={title}
        loading={loading}
        items={users}
        minItemWidth={140}
        renderItem={(holder) => (
          <UserCard
            id={holder.id as Hex}
            name={holder.name ?? truncateAddress(holder.id as Hex)}
            bio={holder.bio}
            imageUrl={holder.imageUrl}
            loading={holder.loading}
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
        link={link}
      />
    </>
  );
};
