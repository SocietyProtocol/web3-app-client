import { describe, expect, it } from "vitest";
import { canEditProfile, showEditForm } from "./profileEditing";

const S = "0xA47f4D7D2FAbDbfDCe865501ADc55a2b370c88cb";
const E = "0x9ba704115f0ed3a431a025ffa0525fdd1d507c3c";
const other = "0x1111111111111111111111111111111111111111";

describe("canEditProfile", () => {
  it("allows editing the member's own profile on /profile", () => {
    expect(canEditProfile({ societyAddress: S })).toBe(true);
  });

  it("allows editing when the page shows the member's Society address", () => {
    expect(
      canEditProfile({ profileAddress: S.toLowerCase(), societyAddress: S }),
    ).toBe(true);
  });

  it("never edits on a read-only page", () => {
    expect(canEditProfile({ readonly: true, societyAddress: S })).toBe(false);
    expect(
      canEditProfile({ readonly: true, profileAddress: S, societyAddress: S }),
    ).toBe(false);
    expect(canEditProfile({ readonly: true, profileAddress: other })).toBe(
      false,
    );
  });

  it("does not edit someone else's profile", () => {
    expect(canEditProfile({ profileAddress: other, societyAddress: S })).toBe(
      false,
    );
  });

  it("does not edit the owner wallet's page, since the form saves the Society address", () => {
    expect(canEditProfile({ profileAddress: E, societyAddress: S })).toBe(
      false,
    );
  });

  it("does not edit a shown profile without a connected member", () => {
    expect(canEditProfile({ profileAddress: other })).toBe(false);
  });
});

describe("showEditForm", () => {
  it("shows the form on /profile when ?edit=true", () => {
    expect(showEditForm({ editRequested: true, societyAddress: S })).toBe(true);
  });

  it("does not show the form without ?edit=true", () => {
    expect(showEditForm({ editRequested: false, societyAddress: S })).toBe(
      false,
    );
  });

  it("ignores ?edit=true on a read-only page", () => {
    expect(
      showEditForm({
        editRequested: true,
        readonly: true,
        profileAddress: other,
        societyAddress: S,
      }),
    ).toBe(false);
    expect(
      showEditForm({
        editRequested: true,
        readonly: true,
        profileAddress: other,
      }),
    ).toBe(false);
  });

  it("ignores ?edit=true on someone else's profile", () => {
    expect(
      showEditForm({
        editRequested: true,
        profileAddress: other,
        societyAddress: S,
      }),
    ).toBe(false);
  });
});
