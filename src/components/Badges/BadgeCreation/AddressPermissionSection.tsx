import { useWatch } from "react-hook-form";
import { useBadgeCreation } from "./BadgeCreationContext";
import { UserAutocomplete, UserOption } from "./UserAutocomplete";
import { SyntheticEvent, useCallback } from "react";

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
    (_: SyntheticEvent<Element, Event>, newValues: (string | UserOption)[]) => {
      setValue(
        field,
        newValues.map((value) =>
          typeof value === "string" ? value : value.id,
        ),
      );
    },
    [setValue, field],
  );

  return (
    <UserAutocomplete
      freeSolo
      multiple
      label={label}
      tooltip={description}
      value={values}
      onChange={handleOnChange}
    />
  );
};
