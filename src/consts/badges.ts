import { ChainVariable } from "./types";

/**
 * Well-known badge identifiers used by the application.
 *
 * These are subgraph badge IDs that the UI needs to recognise to render
 * special behaviour (e.g. the Governor voting power on the governance
 * page). Badge quantities, including the Governor total, are read from the
 * badges contract (`totalSupply`), never hardcoded.
 *
 * Badge ids are assigned per deployment, so they differ between chains:
 * resolve them with `useChainVar` (or `pickChainVar`).
 */
export const GOVERNOR_BADGE_ID: ChainVariable<string> = {
  // "[Rehearsal] Governor", the stand-in created for the Sepolia staging
  // rehearsal (scripts/rehearsal/setup-sepolia-legacy.mjs).
  sepolia: "69",
  // "Governor"
  mainnet: "13",
};
