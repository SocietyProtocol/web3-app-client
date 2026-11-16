import type { Persona, PersonaKind } from "../../fixtures";
import type { Pages } from "../pages";

/**
 * Steps that many scenarios start with, in `onboarding`, `tx-failures` and
 * elsewhere: a new user on the wizard, or on its review step.
 */
type Start = {
  persona: (kind: PersonaKind) => Promise<Persona>;
  pages: Pages;
  /** "newFunded" when the scenario needs the wallet to hold ETH; "new" (no ETH anywhere) when left out. */
  kind?: "new" | "newFunded";
};

/** A new user connects on /profile and opens the wizard's first step. */
export async function openWizard({ persona, pages, kind = "new" }: Start): Promise<Persona> {
  const me = await persona(kind);
  await pages.onboarding.open();
  await pages.shell.connect();
  await pages.onboarding.start();
  return me;
}

/** The same, filled in and on the review step, one click away from saving. */
export async function reachReview(
  start: Start,
  profile: { name: string; bio?: string } = { name: "Onboarding Test", bio: "Made by the onboarding tests." },
): Promise<Persona> {
  const me = await openWizard(start);
  await start.pages.onboarding.fill(profile);
  await start.pages.onboarding.toReview();
  return me;
}
