export type AppThemeMode = "light" | "dark";

export type ThemePalette = {
  bg: string;
  surface: string;
  sunken: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  control: string;
  accent: string;
  accentStrong: string;
  accentInk: string;
  accentSoft: string;
  selected: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
};

/* Keep in sync with the --q-* colour declarations in src/ui/tokens.css. */
export const paletteTokens: Record<AppThemeMode, ThemePalette> = {
  light: {
    bg: "oklch(0.972 0.006 250)",
    surface: "oklch(0.995 0.002 250)",
    sunken: "oklch(0.955 0.008 250)",
    text: "oklch(0.22 0.018 250)",
    textMuted: "oklch(0.43 0.015 250)",
    textFaint: "oklch(0.53 0.012 250)",
    border: "oklch(0.88 0.01 250)",
    control: "oklch(0.56 0.02 250)",
    accent: "oklch(0.52 0.13 250)",
    accentStrong: "oklch(0.46 0.14 250)",
    accentInk: "oklch(0.99 0.005 250)",
    accentSoft: "oklch(0.94 0.03 250)",
    selected: "oklch(0.945 0.02 250)",
    success: "oklch(0.47 0.11 145)",
    successSoft: "oklch(0.95 0.03 145)",
    warning: "oklch(0.47 0.1 75)",
    warningSoft: "oklch(0.96 0.03 75)",
    danger: "oklch(0.5 0.16 25)",
    dangerSoft: "oklch(0.95 0.03 25)",
  },
  dark: {
    bg: "oklch(0.17 0.012 250)",
    surface: "oklch(0.215 0.012 250)",
    sunken: "oklch(0.145 0.01 250)",
    text: "oklch(0.965 0.004 250)",
    textMuted: "oklch(0.8 0.01 250)",
    textFaint: "oklch(0.68 0.012 250)",
    border: "oklch(0.32 0.012 250)",
    control: "oklch(0.55 0.015 250)",
    accent: "oklch(0.74 0.12 250)",
    accentStrong: "oklch(0.8 0.12 250)",
    accentInk: "oklch(0.16 0.02 250)",
    accentSoft: "oklch(0.27 0.05 250)",
    selected: "oklch(0.25 0.03 250)",
    success: "oklch(0.8 0.13 145)",
    successSoft: "oklch(0.27 0.04 145)",
    warning: "oklch(0.83 0.12 75)",
    warningSoft: "oklch(0.28 0.04 75)",
    danger: "oklch(0.76 0.13 25)",
    dangerSoft: "oklch(0.27 0.04 25)",
  },
};
