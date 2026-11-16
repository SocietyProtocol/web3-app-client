import { describe, expect, it } from "vitest";
import { getSocialLinks, NEW_TAB_SUFFIX } from "../socialLinks";
import { URLS } from "../urls";

describe("getSocialLinks", () => {
  it("lists the links in design order and hides YouTube while its URL is unset", () => {
    const links = getSocialLinks({ ...URLS, YOUTUBE: null });
    expect(links.map((l) => l.id)).toEqual([
      "website",
      "forum",
      "discord",
      "x",
    ]);
  });

  it("shows all five links by default, YouTube third", () => {
    expect(getSocialLinks().map((l) => l.id)).toEqual([
      "website",
      "forum",
      "youtube",
      "discord",
      "x",
    ]);
  });

  it("uses the official URLs", () => {
    const hrefs = Object.fromEntries(
      getSocialLinks().map((l) => [l.id, l.href]),
    );
    expect(hrefs).toEqual({
      website: "https://societyprotocol.io",
      forum: "https://forum.societyprotocol.io",
      youtube: "https://www.youtube.com/@SocietyProtocolStream",
      discord: "https://discord.com/invite/fpk7eH7aWQ",
      x: "https://x.com/ProtocolSociety",
    });
  });

  it("shows YouTube third once its URL is set", () => {
    const links = getSocialLinks({
      ...URLS,
      YOUTUBE: "https://youtube.example/channel",
    });
    expect(links.map((l) => l.id)).toEqual([
      "website",
      "forum",
      "youtube",
      "discord",
      "x",
    ]);
    expect(links[2].href).toBe("https://youtube.example/channel");
  });

  it("renders Website and Forum as pills and the rest as icons", () => {
    const kinds = Object.fromEntries(
      getSocialLinks().map((l) => [l.id, l.kind]),
    );
    expect(kinds).toEqual({
      website: "pill",
      forum: "pill",
      youtube: "icon",
      discord: "icon",
      x: "icon",
    });
  });

  it("gives every link a non-empty accessible name", () => {
    for (const link of getSocialLinks()) {
      expect(link.name.trim()).not.toBe("");
    }
    expect(NEW_TAB_SUFFIX).toBe(" (opens in a new tab)");
  });
});
