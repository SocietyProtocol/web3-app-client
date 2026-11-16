import { describe, expect, it } from "vitest";
import type { UserQuery } from "../../../.graphclient";
import { offersAccountSetup } from "./accountSetup";

const knownUser = (profile: unknown) =>
  ({
    id: "0x00000000000000000000000000000000000000a1",
    profile,
  }) as unknown as UserQuery["user"];

describe("offersAccountSetup", () => {
  it("is false while the user is loading", () => {
    expect(offersAccountSetup({ isLoading: true, data: undefined })).toBe(
      false,
    );
  });

  it("is true when the subgraph has no user for the address", () => {
    expect(offersAccountSetup({ isLoading: false, data: undefined })).toBe(
      true,
    );
    expect(offersAccountSetup({ isLoading: false, data: null })).toBe(true);
  });

  it("is true when the subgraph knows the user but it has no profile", () => {
    expect(
      offersAccountSetup({ isLoading: false, data: knownUser(null) }),
    ).toBe(true);
  });

  it("is false when the user has a profile", () => {
    expect(
      offersAccountSetup({ isLoading: false, data: knownUser({ id: "1" }) }),
    ).toBe(false);
  });
});
