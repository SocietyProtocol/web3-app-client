import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    border: {
      light: string;
    };
  }

  interface PaletteOptions {
    border?: {
      light?: string;
    };
  }

  interface TypeBackground {
    default: string;
    paper: string;
    subtle: string;
  }

  interface TypeAction {
    hover: string;
    selected: string;
  }

  interface Mixins {
    borderGradient: (borderRadius?: string | number) => Record<string, unknown>;
  }
}
