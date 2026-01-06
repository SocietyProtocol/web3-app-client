import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface TypeBackground {
    default: string;
    paper: string;
    subtle: string;
    bubble: string;
    input: string;
  }

  interface TypeText {
    label: string;
  }

  interface Palette {
    border: {
      light: string;
      input: string;
      bubble: string;
    };
  }

  interface PaletteOptions {
    border?: {
      light?: string;
      input?: string;
      bubble?: string;
    };
  }

  interface TypeAction {
    hover: string;
    selected: string;
  }

  interface Mixins {
    borderGradient: (borderRadius?: string | number) => Record<string, unknown>;
  }
}
