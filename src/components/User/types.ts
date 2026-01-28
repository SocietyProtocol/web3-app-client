import { UserData } from "@/data/users/types";

export interface UserCardProps extends Partial<UserData> {
  loading?: boolean;
  readonly?: boolean;
  showAddress?: boolean;
  size?: "small" | "medium" | "large";
  children?: React.ReactNode;
  highlightYou?: boolean;
  link?: boolean;
}

export interface UserTagProps extends Partial<UserData> {
  loading?: boolean;
  size?: "small" | "medium";
  highlightYou?: boolean;
  link?: boolean;
}

export interface UserHandleProps extends Partial<UserData> {
  loading?: boolean;
  showPreview?: boolean;
  highlightYou?: boolean;
  size?: "small" | "medium";
  link?: boolean;
}
