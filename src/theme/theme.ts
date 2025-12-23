import { createTheme } from "@mui/material/styles";
import { dark } from "./palette/dark";
import { MuiButton } from "./components/MuiButton";

export const theme = createTheme({
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
    fontFamily: "Space Grotesk, sans-serif",
    allVariants: {
      letterSpacing: "0.89px",
    },
  },
});
