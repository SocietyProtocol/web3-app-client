import { Hex } from "viem";
import { UserHandle } from "../UserHandle";
import { UserOption } from "./UserAutocomplete";

export const renderUserItem = (item: UserOption, multiple: boolean) => (
  <UserHandle
    id={item.id as Hex}
    name={item.name}
    imageUrl={item.imageUrl}
    highlightYou
    fullAddress={!multiple}
  />
);
