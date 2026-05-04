import { HTMLAttributes, Key } from "react";
import { UserOption } from "./UserAutocomplete";
import { UserHandle } from "../UserHandle";
import { Box } from "@mui/material";

export const renderUserOption = (
  props: HTMLAttributes<HTMLLIElement> & {
    key: Key;
  },
  option: UserOption,
) => {
  return (
    <Box
      component="li"
      {...props}
      key={option.id}
      sx={{
        width: "100%",
      }}
    >
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
