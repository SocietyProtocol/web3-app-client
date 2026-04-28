import { createTheme } from "@mui/material/styles";
import { dark } from "./palette/dark";
import { MuiButton } from "./components/MuiButton";
import { MuiStepper } from "./components/MuiStepper";
import { MuiTextField } from "./components/MuiTextField";
import { MuiSelect } from "./components/MuiSelect";
import { createCustomMixins } from "./mixins";
import { MuiCard } from "./components/MuiCard";
import { MuiDialog } from "./components/MuiDialog";
import { MuiDialogTitle } from "./components/MuiDialogTitle";
import { MuiDialogContent } from "./components/MuiDialogContent";
import { breakpoints } from "./breakpoints";
import { MuiPaginationItem } from "./components/MuiPaginationItem";
import { MuiChip } from "./components/MuiChip";
import { MuiTabs } from "./components/MuiTabs";
import { MuiAccordion } from "./components/MuiAccordion";
import { MuiAccordionSummary } from "./components/MuiAccordionSummary";
import { MuiAccordionDetails } from "./components/MuiAccordionDetails";
import { MuiSwitch } from "./components/MuiSwitch";

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
    MuiSelect,
    MuiTextField,
    MuiCard,
    MuiDialog,
    MuiDialogTitle,
    MuiDialogContent,
    MuiAccordion,
    MuiAccordionSummary,
    MuiAccordionDetails,
    MuiPaginationItem,
    MuiChip,
    MuiTabs,
    MuiSwitch,
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
    h6: {
      fontWeight: 500,
      fontSize: "1.25rem",
      lineHeight: 1.6,
    },
  },
});

export const theme = createTheme(baseTheme, {
  mixins: {
    ...baseTheme.mixins,
    ...createCustomMixins(baseTheme),
  },
});
