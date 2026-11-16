import { isEqualCaseInsensitive } from "@/utils/string";

interface CanEditProfileInput {
  /** The page shows the profile for viewing only (e.g. /user/<address>). */
  readonly?: boolean;
  /** The profile on the page; omitted on /profile, the member's own. */
  profileAddress?: string;
  /** The connected member's Society address. */
  societyAddress?: string;
}

/**
 * Whether the page may show the edit form. The form always saves the
 * connected member's own profile (their Society address), so it is only
 * offered on that profile, never on a read-only page or someone else's,
 * whatever `?edit=true` says.
 */
export const canEditProfile = ({
  readonly,
  profileAddress,
  societyAddress,
}: CanEditProfileInput): boolean => {
  if (readonly) return false;
  if (!profileAddress) return true;
  return (
    !!societyAddress && isEqualCaseInsensitive(profileAddress, societyAddress)
  );
};

/**
 * Whether the page shows the edit form: `?edit=true` was asked for and the
 * viewer may edit this profile. Otherwise the profile is shown read-only.
 */
export const showEditForm = ({
  editRequested,
  ...input
}: CanEditProfileInput & { editRequested: boolean }): boolean =>
  editRequested && canEditProfile(input);
