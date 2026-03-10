import { HTMLAttributes, Key } from "react";
import { BadgeOption } from "./types";
import { Box } from "@mui/material";
import { BadgeHandle } from "../BadgeHandle";

export const renderBadgeOption = (
  props: HTMLAttributes<HTMLLIElement> & {
    key: Key;
  },
  option: BadgeOption,
) => {
  return (
    <Box component="li" {...props} key={option.id}>
      <BadgeHandle
        id={option.id}
        name={option.name}
        profileUser={option.profileUser}
      />
    </Box>
  );
};
