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
    highContrast: string;
    danger: string;
  }

  interface TypeText {
    primary: string;
    secondary: string;
    tertiary: string;
  }

  interface Palette {
    gold: Palette["primary"];
    silver: Palette["primary"];
    bronze: Palette["primary"];
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

    chart: {
      stroke: string;
      fill: string;
    };
  }

  interface PaletteOptions {
    gold?: PaletteOptions["primary"];
    silver?: PaletteOptions["primary"];
    bronze?: PaletteOptions["primary"];
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
    backgroundGradient: (
      angle: string | number,
      gradient: "gold" | "silver" | "bronze" | "primary",
      startOpacity?: number,
      endOpacity?: number,
    ) => Record<string, unknown>;
    borderGradient: (
      borderRadius?: string | number,
      gradient?: "gold" | "silver" | "bronze" | "primary",
    ) => Record<string, unknown>;
  }
}

declare module "@mui/material/Chip" {
  interface ChipPropsColorOverrides {
    gold: true;
    silver: true;
    bronze: true;
  }
}
