import "@mui/material/styles";

// Augment MUI Select variant types

declare module "@mui/material/styles" {
  interface PaletteColor {
    100?: string;
  }

  interface SimplePaletteColorOptions {
    100?: string;
  }

  interface TypeBackground {
    default: string;
    page: string;
    paper: string;
    paperDark: string;
    subtle: string;
    bubble: string;
    input: string;
    toggleButton: string;
    toggleButtonHover: string;
  }

  interface TypeText {
    primary: string;
    secondary: string;
    tertiary: string;
  }

  interface Palette {
    gold: Palette["primary"];
    neutral: {
      main: string;
    };
    border: {
      light: string;
      input: string;
      bubble: string;
      card: string;
      counter: string;
      area: string;
      dropArea: string;
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
    gold?: PaletteOptions["primary"];
    neutral?: {
      main?: string;
    };
    border?: {
      light?: string;
      input?: string;
      bubble?: string;
      card?: string;
      counter?: string;
      area?: string;
      dropArea?: string;
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
