import { alpha, PaletteOptions } from "@mui/material/styles";
import * as colors from "./colors";

export const dark: PaletteOptions = {
  mode: "dark",
  primary: {
    main: colors.PRIMARY_MAIN,
    contrastText: colors.PRIMARY_CONTRAST_TEXT,
    100: colors.PRIMARY_SHADE_100,
  },
  background: {
    default: colors.BACKGROUND_DEFAULT,
    page: colors.BACKGROUND_PAGE,
    paper: colors.BACKGROUND_PAPER,
    paperDark: colors.BACKGROUND_PAPER_DARK,
    subtle: alpha(colors.PRIMARY_CONTRAST_TEXT, 0.1),
    input: colors.BACKGROUND_INPUT,
    bubble: colors.BACKGROUND_BUBBLE,
    toggleButton: colors.BACKGROUND_TOGGLE_BUTTON,
    toggleButtonHover: colors.BACKGROUND_TOGGLE_BUTTON_HOVER,
  },
  text: {
    primary: colors.TEXT_PRIMARY,
    secondary: colors.TEXT_SECONDARY,
    tertiary: colors.TEXT_TERTIARY,
  },
  success: {
    main: colors.SUCCESS_MAIN,
    dark: colors.SUCCESS_DARK,
    light: colors.SUCCESS_LIGHT,
    contrastText: colors.SUCCESS_CONTRAST,
  },
  error: {
    main: colors.ERROR_MAIN,
    dark: colors.ERROR_DARK,
    light: colors.ERROR_LIGHT,
    contrastText: colors.ERROR_CONTRAST,
  },
  warning: {
    main: colors.WARNING_MAIN,
    dark: colors.WARNING_DARK,
    light: colors.WARNING_LIGHT,
    contrastText: colors.WARNING_CONTRAST,
  },
  info: {
    main: colors.INFO_MAIN,
    dark: colors.INFO_DARK,
    light: colors.INFO_LIGHT,
    contrastText: colors.INFO_CONTRAST,
  },
  gold: {
    main: colors.GOLD_MAIN,
    light: colors.GOLD_LIGHT,
    dark: colors.GOLD_DARK,
    contrastText: colors.GOLD_CONTRAST,
  },
  neutral: {
    main: colors.NEUTRAL_MAIN,
  },
  divider: colors.DIVIDER,
  border: {
    light: alpha(colors.PRIMARY_MAIN, 0.1),
    input: alpha(colors.PRIMARY_CONTRAST_TEXT, 0.1),
    card: colors.BORDER_CARD,
    bubble: colors.BORDER_BUBBLE,
    counter: colors.BORDER_COUNTER,
    area: colors.BORDER_AREA,
    dropArea: colors.DROP_AREA_BORDER,
  },
  action: {
    hover: alpha(colors.PRIMARY_MAIN, 0.11),
    selected: alpha(colors.PRIMARY_MAIN, 0.047),
  },
  gradients: {
    official: `linear-gradient(180deg, ${colors.GOLD_LIGHT} 0%, ${colors.GOLD_MAIN} 100%)`,
    darkOfficial: `linear-gradient(90deg, ${alpha(
      colors.GOLD_LIGHT,
      0.1,
    )} 0%, ${alpha(colors.PRIMARY_CONTRAST_TEXT, 0.1)} 100%)`,
    primary: `linear-gradient(to bottom, ${colors.PRIMARY_MAIN}, ${alpha(
      colors.PRIMARY_MAIN,
      0.31,
    )})`,
  },
  chart: {
    stroke: colors.CHART_STROKE,
    fill: colors.CHART_FILL,
  },
};
