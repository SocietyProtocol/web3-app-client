import { Stack } from "@mui/material";
import { BadgeEditorsField } from "./AddressPermissionSection";
import { BadgePermissionsField } from "./BadgePermissionsField";

interface BadgePermissionsStepProps {
  hideSections?: {
    minters?: boolean;
    burners?: boolean;
    transferers?: boolean;
    editors?: boolean;
  };
}

export const BadgePermissionsStep = ({
  hideSections,
}: BadgePermissionsStepProps) => {
  return (
    <Stack spacing={4}>
      {!hideSections?.minters && (
        <BadgePermissionsField
          field="minters"
          label="Who can Mint:"
          description="Holders of these badges can mint this badge to others"
        />
      )}

      {!hideSections?.burners && (
        <BadgePermissionsField
          field="burners"
          label="Who can Burn:"
          description="Holders of these badges can burn this badge"
        />
      )}

      {!hideSections?.transferers && (
        <BadgePermissionsField
          field="transferers"
          label="Who can Transfer:"
          description="Holders of these badges can transfer this badge"
        />
      )}

      {!hideSections?.editors && (
        <BadgeEditorsField
          field="editors"
          label="Who can Manage:"
          description="Addresses that can edit badge metadata"
        />
      )}
    </Stack>
  );
};
