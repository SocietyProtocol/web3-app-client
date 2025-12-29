import { createTheme } from "@mui/material/styles";
import { dark } from "./palette/dark";
import { MuiButton } from "./components/MuiButton";
import { createCustomMixins } from "./mixins";

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
  },
  typography: {
    fontFamily: "var(--font-space-grotesk), sans-serif",
    allVariants: {
      letterSpacing: "0.89px",
    },
  },
});

export const theme = createTheme(baseTheme, {
  mixins: {
    ...baseTheme.mixins,
    ...createCustomMixins(baseTheme),
  },
});
