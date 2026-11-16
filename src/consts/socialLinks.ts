import { URLS } from "./urls";

export type SocialLinkId = "website" | "forum" | "youtube" | "discord" | "x";

export interface SocialLink {
  id: SocialLinkId;
  /** Visible text, shown on pill links only. */
  label: string;
  /** Accessible name, without the "opens in a new tab" suffix. */
  name: string;
  href: string;
  /** "pill" = SP mark circle plus a label; "icon" = circle with a glyph. */
  kind: "pill" | "icon";
}

type SocialLinkUrls = Pick<
  typeof URLS,
  "WEBSITE" | "FORUM" | "YOUTUBE" | "DISCORD" | "TWITTER"
>;

/**
 * Ordered Society Protocol links for the top bar and the mobile drawer.
 * A link whose URL is not set (null) is left out.
 */
export const getSocialLinks = (urls: SocialLinkUrls = URLS): SocialLink[] => {
  const links: (Omit<SocialLink, "href"> & { href: string | null })[] = [
    {
      id: "website",
      label: "Website",
      name: "Society Protocol website",
      href: urls.WEBSITE,
      kind: "pill",
    },
    {
      id: "forum",
      label: "Forum",
      name: "Forum",
      href: urls.FORUM,
      kind: "pill",
    },
    {
      id: "youtube",
      label: "YouTube",
      name: "YouTube",
      href: urls.YOUTUBE,
      kind: "icon",
    },
    {
      id: "discord",
      label: "Discord",
      name: "Discord",
      href: urls.DISCORD,
      kind: "icon",
    },
    { id: "x", label: "X", name: "X", href: urls.TWITTER, kind: "icon" },
  ];

  return links.filter((link): link is SocialLink => Boolean(link.href));
};

export const NEW_TAB_SUFFIX = " (opens in a new tab)";
