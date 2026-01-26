import { Stack } from "@mui/material";
import { BadgeEditorsField } from "./AddressPermissionSection";
import { BadgePermissionsField } from "./BadgePermissionsField";

export const BadgePermissionsStep = () => {
  return (
    <Stack spacing={4}>
      <BadgePermissionsField
        field="minters"
        label="Who can Mint:"
        description="Holders of these badges can mint this badge to others"
      />

      <BadgePermissionsField
        field="burners"
        label="Who can Burn:"
        description="Holders of these badges can burn this badge"
      />

      <BadgePermissionsField
        field="transferers"
        label="Who can Transfer:"
        description="Holders of these badges can transfer this badge"
      />

      <BadgeEditorsField
        field="editors"
        label="Who can Manage:"
        description="Addresses that can edit badge metadata"
      />
    </Stack>
  );
};
