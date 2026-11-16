import type { Persona, PersonaKind, PersonaOptions } from "../../fixtures";
import type { Pages } from "../../support/pages";

/**
 * Steps the routing and sponsorship specs share. Not a spec: files here
 * that do not end in .spec.ts are not collected.
 */
type Start = {
  persona: (kind: PersonaKind, options?: PersonaOptions) => Promise<Persona>;
  pages: Pages;
};

/**
 * A member with a profile opens the edit form of /profile and changes the
 * name: one click on "Update Profile" away from a sponsored
 * updateProfileURI. Returns the member and the new name.
 */
export async function reachProfileSave(
  start: Start,
  kind: "member" | "fundedMember" = "fundedMember",
): Promise<{ me: Persona; newName: string }> {
  const me = await start.persona(kind);
  const newName = `${me.profile!.name} (edited)`;
  await start.pages.profile.open();
  await start.pages.shell.connect();
  await start.pages.profile.startEditing();
  await start.pages.profile.editNameInput.fill(newName);
  return { me, newName };
}
