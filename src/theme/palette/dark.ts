import { PaletteOptions } from "@mui/material/styles";

export const dark: PaletteOptions = {
  mode: "dark",
  primary: {
    main: "#FFFFFF",
    contrastText: "#09090B",
  },
  background: {
    default: "#2c2c2c",
    paper: "#222222",
    subtle: "#0000001A",
    input: "#2F2F2F",
    bubble: "#151515",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "rgba(255, 255, 255, 0.4)",
    label: "#CACACA",
  },
  success: {
    main: "#008C73",
    contrastText: "#2BFFD9",
  },
  divider: "rgba(255, 255, 255, 0.4)",
  border: {
    light: "rgba(255, 255, 255, 0.1)",
    input: "rgba(0, 0, 0, 0.1)",
    bubble: "#4F4F4F",
  },
  action: {
    hover: "#ffffff1c",
    selected: "#ffffff0c",
  },
};
