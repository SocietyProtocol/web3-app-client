import { UserOption } from "@/components/User/UserAutocomplete/UserAutocomplete";
import { atom } from "jotai";
import { Hex } from "viem";
import { UsersQuery } from "../../.graphclient";

export const usersMapAtom = atom(new Map<string, UserOption>());

export const usersAtom = atom(
  (get) => get(usersMapAtom),
  (get, set, update: UsersQuery) => {
    const prev = get(usersMapAtom);
    const map = new Map(prev);
    let changed = false;

    update.users.forEach((user) => {
      const key = user.id.toLowerCase();
      const next: UserOption = {
        id: user.id as Hex,
        name: user.name as string,
        imageUrl: user.imageUrl as string | undefined,
      };
      const existing = map.get(key);

      if (
        !existing ||
        existing.name !== next.name ||
        existing.imageUrl !== next.imageUrl
      ) {
        map.set(key, next);
        changed = true;
      }
    });

    if (changed) {
      set(usersMapAtom, map);
    }
  },
);
