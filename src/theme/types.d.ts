import "@mui/material/styles";

// Augment MUI Select variant types

declare module "@mui/material/styles" {
  interface Palette {
    gold: Palette["primary"];
    neutral: {
      main: string;
    };
  }

  interface PaletteOptions {
    gold?: PaletteOptions["primary"];
    neutral?: {
      main?: string;
    };
  }

  interface TypeBackground {
    default: string;
    page: string;
    paper: string;
    subtle: string;
    bubble: string;
    input: string;
    toggleButton: string;
    toggleButtonHover: string;
  }

  interface Palette {
    border: {
      light: string;
      input: string;
      bubble: string;
      card: string;
      counter: string;
      area: string;
    };
    gradients: {
      official: string;
      primary: string;
      darkOfficial: string;
    };

    chart: {
      stroke: string;
      fill: string;
    };
  }

  interface PaletteOptions {
    border?: {
      light?: string;
      input?: string;
      bubble?: string;
      card?: string;
      counter?: string;
      area?: string;
    };
    gradients?: {
      official?: string;
      primary?: string;
      darkOfficial?: string;
    };
    chart?: {
      stroke?: string;
      fill?: string;
    };
  }

  interface TypeAction {
    hover: string;
    selected: string;
  }

  interface Mixins {
    borderGradient: (
      borderRadius?: string | number,
      gradient?: keyof Palette["gradients"],
    ) => Record<string, unknown>;
  }
}

declare module "@mui/material/Chip" {
  interface ChipPropsColorOverrides {
    gold: true;
  }
}
