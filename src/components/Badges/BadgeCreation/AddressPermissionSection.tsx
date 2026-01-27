import { useWatch } from "react-hook-form";
import { useBadgeCreation } from "./BadgeCreationContext";
import { UserAutocomplete } from "./UserAutocomplete";
import { useCallback } from "react";

interface BadgeEditorsFieldProps {
  field: "editors";
  label: string;
  description: string;
}

export const BadgeEditorsField = ({
  field,
  label,
  description,
}: BadgeEditorsFieldProps) => {
  const { form } = useBadgeCreation();
  const { control, setValue } = form;

  const values = useWatch({ control, name: field, defaultValue: [] });

  const handleOnChange = useCallback(
    (newValues: string[]) => {
      setValue(field, newValues);
    },
    [setValue, field],
  );

  return (
    <UserAutocomplete
      label={label}
      tooltip={description}
      value={values}
      onChange={handleOnChange}
    />
  );
};
