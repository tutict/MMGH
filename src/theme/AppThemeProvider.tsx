import { useEffect, useMemo, useState } from "react";
import { CssBaseline, StyledEngineProvider, ThemeProvider, createTheme } from "@mui/material";
import { paletteTokens } from "./palette";

type AppThemeMode = keyof typeof paletteTokens;

const fontFamily =
  '"Segoe UI Variable Text", "Segoe UI", "Microsoft YaHei UI", "PingFang SC", system-ui, sans-serif';

function readDocumentTheme(): AppThemeMode {
  if (typeof document === "undefined") {
    return "light";
  }
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function useDocumentTheme() {
  const [mode, setMode] = useState(readDocumentTheme);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      setMode(root.dataset.theme === "dark" ? "dark" : "light");
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return mode;
}

function createAppTheme(mode: AppThemeMode) {
  const palette = paletteTokens[mode];

  return createTheme({
    cssVariables: {
      cssVarPrefix: "mui",
      nativeColor: true,
    },
    palette: {
      mode,
      primary: {
        main: palette.accent,
        dark: palette.accentStrong,
        contrastText: palette.accentInk,
      },
      secondary: {
        main: palette.textMuted,
        contrastText: palette.surface,
      },
      info: {
        main: palette.accent,
      },
      success: {
        main: palette.success,
        contrastText: palette.bg,
      },
      warning: {
        main: palette.warning,
        contrastText: palette.bg,
      },
      error: {
        main: palette.danger,
        contrastText: palette.bg,
      },
      background: {
        default: palette.bg,
        paper: palette.surface,
      },
      text: {
        primary: palette.text,
        secondary: palette.textMuted,
        disabled: palette.textFaint,
      },
      divider: palette.border,
      action: {
        selected: palette.selected,
        focus: palette.accentSoft,
      },
    },
    shape: {
      borderRadius: 8,
    },
    typography: {
      fontFamily,
      fontSize: 14,
      h1: { fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.3 },
      h2: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.3 },
      h3: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.3 },
      h4: { fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.3 },
      body1: { fontSize: "0.875rem", lineHeight: 1.55 },
      body2: { fontSize: "0.8125rem", lineHeight: 1.55 },
      caption: { fontSize: "0.75rem", lineHeight: 1.4 },
      button: { fontSize: "0.875rem", fontWeight: 600, textTransform: "none" },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: "var(--q-bg)",
            color: "var(--q-text)",
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            minHeight: 32,
            borderRadius: 8,
            paddingInline: 12,
            fontSize: "0.875rem",
            fontWeight: 600,
            textTransform: "none",
            "&.Mui-disabled": {
              color: "var(--q-text-faint)",
            },
            "&.MuiButton-outlined.MuiButton-colorPrimary": {
              "--variant-outlinedBorder": "var(--q-control)",
              "--variant-outlinedColor": "var(--q-text)",
              "--variant-outlinedHoverBg": "var(--q-sunken)",
              "&:hover": {
                borderColor: "var(--q-text-muted)",
              },
            },
          },
          sizeSmall: {
            minHeight: 28,
            fontSize: "0.8125rem",
          },
          contained: {
            "&.Mui-disabled": {
              backgroundColor: "var(--q-sunken)",
              color: "var(--q-text-faint)",
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: "var(--q-surface)",
            borderRadius: 8,
            fontSize: "0.875rem",
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--q-text-muted)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--q-accent)",
              borderWidth: 1,
              boxShadow: "0 0 0 1px var(--q-accent)",
            },
          },
          notchedOutline: {
            borderColor: "var(--q-control)",
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          input: {
            "&::placeholder": {
              color: "var(--q-text-faint)",
              opacity: 1,
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: "var(--q-text-muted)",
            "&.Mui-focused": {
              color: "var(--q-accent)",
            },
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            color: "var(--q-text-muted)",
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginLeft: 0,
            fontSize: "0.75rem",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            height: 24,
            borderRadius: 999,
            fontSize: "0.75rem",
            fontWeight: 600,
          },
          outlined: {
            borderColor: "var(--q-control)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
          rounded: {
            borderRadius: 8,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            marginTop: 4,
            borderRadius: 8,
            boxShadow: "0 12px 32px rgb(0 0 0 / 0.16)",
          },
          list: {
            padding: 4,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            minHeight: 36,
            marginInline: 4,
            borderRadius: 4,
            fontSize: "0.875rem",
            "&:hover": {
              backgroundColor: "var(--q-sunken)",
            },
            "&.Mui-selected": {
              backgroundColor: "var(--q-selected)",
            },
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: {
            color: "var(--q-accent)",
          },
          rail: {
            backgroundColor: "var(--q-border)",
            opacity: 1,
          },
          thumb: {
            boxShadow: "none",
            "&:hover, &.Mui-focusVisible": {
              boxShadow: "0 0 0 6px var(--q-accent-soft)",
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            color: "var(--q-control)",
          },
          thumb: {
            backgroundColor: "var(--q-surface)",
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            padding: 6,
            color: "var(--q-control)",
            "&.Mui-checked": {
              color: "var(--q-accent)",
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 4,
            padding: "6px 8px",
            backgroundColor: "var(--q-text)",
            color: "var(--q-bg)",
            fontSize: "0.75rem",
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: "var(--q-scrim)",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 8,
            boxShadow: "0 24px 64px rgb(0 0 0 / 0.24)",
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            padding: "16px 20px 8px",
            fontSize: "1rem",
            fontWeight: 600,
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: "8px 20px",
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            gap: 8,
            padding: "16px 20px 20px",
          },
        },
      },
    },
  });
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useDocumentTheme();
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
