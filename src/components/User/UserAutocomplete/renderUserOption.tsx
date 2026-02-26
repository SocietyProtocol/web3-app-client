import { HTMLAttributes } from "react";
import { UserOption } from "./UserAutocomplete";
import { UserHandle } from "../UserHandle";
import { Box } from "@mui/material";

export const renderUserOption = (
  props: HTMLAttributes<HTMLLIElement> & {
    key: string;
  },
  option: UserOption,
) => {
  return (
    <Box component="li" {...props}>
      <UserHandle
        id={option.id}
        name={option.name}
        imageUrl={option.imageUrl}
        highlightYou
        fullAddress
      />
    </Box>
  );
};
