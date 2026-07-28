import { Community } from "../../../../.graphclient";

export type BadgeOption = {
  id: string;
  name: string;
  profileUser?: { name?: string | null } | null;
  community?: Pick<Community, "id" | "name"> | null;
};
