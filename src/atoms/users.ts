import { UserOption } from "@/components/User/UserAutocomplete/UserAutocomplete";
import { atom } from "jotai";
import { Hex } from "viem";
import { UsersQuery } from "../../.graphclient";

export const usersMapAtom = atom(new Map<string, UserOption>());

export const usersAtom = atom(
  (get) => get(usersMapAtom),
  (get, set, update: UsersQuery) => {
    const map = new Map(get(usersMapAtom));

    update.users.forEach((user) => {
      if (!map.has(user.id.toLowerCase())) {
        map.set(user.id.toLowerCase(), {
          id: user.id as Hex,
          name: user.name as string,
          imageUrl: user.imageUrl as string | undefined,
        });
      }
    });

    if (map.size !== get(usersMapAtom).size) {
      set(usersMapAtom, map);
    }
  },
);
