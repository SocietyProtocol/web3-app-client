import { createTheme } from "@mui/material/styles";
import { dark } from "./palette/dark";
import { MuiButton } from "./components/MuiButton";
import { MuiStepper } from "./components/MuiStepper";
import { MuiTextField } from "./components/MuiTextField";
import { createCustomMixins } from "./mixins";
import { MuiCard } from "./components/MuiCard";

const baseTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: "class",
  },
  palette: dark,
  colorSchemes: {
    dark: {
      palette: dark,
    },
  },
  components: {
    MuiButton,
    MuiStepper,
    MuiTextField,
    MuiCard,
  },
  typography: {
    fontFamily: "var(--font-space-grotesk), sans-serif",
    allVariants: {
      letterSpacing: "0.89px",
    },
    h4: {
      fontWeight: 400,
      fontSize: "2.375rem",
      lineHeight: "100%",
    },
    h5: {
      fontWeight: 400,
      fontSize: "2rem",
      lineHeight: "120%",
    },
  },
});

export const theme = createTheme(baseTheme, {
  mixins: {
    ...baseTheme.mixins,
    ...createCustomMixins(baseTheme),
  },
});
