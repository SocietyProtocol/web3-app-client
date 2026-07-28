"use client";
import { Page } from "@/components/Page/Page";
import { parseAsBoolean, useQueryState } from "nuqs";
import { BadgeDetails } from "@/components/Badges/BadgeDetails";

export interface BadgePageLayoutProps {
  id: string;
  initiallyEditing?: boolean;
}

export const BadgePageLayout = ({
  id,
  initiallyEditing,
}: BadgePageLayoutProps) => {
  const [isEditing, setIsEditing] = useQueryState(
    "edit",
    parseAsBoolean.withDefault(initiallyEditing ?? false).withOptions({
      history: "replace",
    }),
  );

  return (
    <Page backButton={!isEditing} defaultBackPath="/badges">
      <BadgeDetails id={id} isEditing={isEditing} setIsEditing={setIsEditing} />
    </Page>
  );
};
