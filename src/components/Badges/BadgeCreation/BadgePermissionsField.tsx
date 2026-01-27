import { useCallback } from "react";
import { useWatch } from "react-hook-form";
import { useBadgeCreation } from "./BadgeCreationContext";
import { BadgeAutocomplete } from "./BadgeAutocomplete";

interface BadgePermissionsFieldProps {
  field: "minters" | "burners" | "transferers";
  label: string;
  description: string;
}

export const BadgePermissionsField = ({
  field,
  label,
  description,
}: BadgePermissionsFieldProps) => {
  const { form } = useBadgeCreation();
  const { control, setValue } = form;

  const values = useWatch({ control, name: field, defaultValue: [] });

  const handleOnChange = useCallback(
    (newValues: string[]) => {
      setValue(field, newValues);
    },
    [field, setValue],
  );

  return (
    <BadgeAutocomplete
      tooltip={description}
      label={label}
      value={values}
      onChange={handleOnChange}
    />
  );
};
