import { createTheme } from "@mui/material/styles";
import { dark } from "./palette/dark";
import { MuiButton } from "./components/MuiButton";
import { MuiStepper } from "./components/MuiStepper";
import { MuiTextField } from "./components/MuiTextField";
import { createCustomMixins } from "./mixins";
import { MuiCard } from "./components/MuiCard";
import { MuiDialog } from "./components/MuiDialog";
import { MuiDialogTitle } from "./components/MuiDialogTitle";
import { MuiDialogContent } from "./components/MuiDialogContent";
import { breakpoints } from "./breakpoints";
import { MuiPaginationItem } from "./components/MuiPaginationItem";

const baseTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: "class",
  },
  breakpoints,
  palette: dark,
  colorSchemes: {
    dark: {
      palette: dark,
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton,
    MuiStepper,
    MuiTextField,
    MuiCard,
    MuiDialog,
    MuiDialogTitle,
    MuiDialogContent,
    MuiPaginationItem,
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
