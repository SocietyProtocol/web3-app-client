import { SvgIcon, SvgIconProps } from "@mui/material";

// Outlined glyphs drawn to match the top-bar design. They use currentColor,
// so the colour comes from the theme. Replace with the designer's SVG
// exports when they are available.

export const YouTubeOutlineIcon = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
    >
      <rect x="2.25" y="5.25" width="19.5" height="13.5" rx="4" />
      <path d="M10 9.25v5.5l4.75-2.75z" />
    </g>
  </SvgIcon>
);

export const DiscordOutlineIcon = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.6 5.4c-1.7.3-3.1.8-4.3 1.5-1.7 2.6-2.4 5.4-2.2 9.7 1.4 1.1 3 1.8 4.6 2.2l1.1-1.9" />
      <path d="M15.4 5.4c1.7.3 3.1.8 4.3 1.5 1.7 2.6 2.4 5.4 2.2 9.7-1.4 1.1-3 1.8-4.6 2.2l-1.1-1.9" />
      <path d="M6.8 16.2c3.4 1.6 7 1.6 10.4 0" />
      <path d="M8.6 5.4l.6 1.4c1.9-.4 3.7-.4 5.6 0l.6-1.4" />
      <circle cx="9" cy="12.6" r="1.4" />
      <circle cx="15" cy="12.6" r="1.4" />
    </g>
  </SvgIcon>
);

export const XGlyphIcon = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
    />
  </SvgIcon>
);
