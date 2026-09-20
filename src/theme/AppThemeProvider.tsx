import { useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

function readDocumentTheme() {
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

const sharedTypography = {
  fontFamily:
    '"Segoe UI Variable Text", "Segoe UI", "Microsoft YaHei UI", "PingFang SC", system-ui, sans-serif',
  button: {
    textTransform: "none",
    fontWeight: 600,
  },
};

function createAppTheme(mode) {
  const isDark = mode === "dark";
  return createTheme({
    cssVariables: true,
    palette: {
      mode,
      primary: {
        main: isDark ? "#8cb4ff" : "#3d6fd9",
        contrastText: isDark ? "#f6f8ff" : "#ffffff",
      },
      secondary: {
        main: isDark ? "#9a9a9a" : "#5d5d5d",
      },
      background: {
        default: isDark ? "#0c0e12" : "#f3f3f3",
        paper: isDark ? "#1a1d24" : "#ffffff",
      },
      text: {
        primary: isDark ? "#ffffff" : "#1a1a1a",
        secondary: isDark ? "#c8c8c8" : "#5d5d5d",
      },
      divider: isDark ? "#3f3f3f" : "#e5e5e5",
      error: {
        main: isDark ? "#ff99a4" : "#c42b1c",
      },
      warning: {
        main: isDark ? "#fce100" : "#9d5d00",
      },
      success: {
        main: isDark ? "#6ccb5f" : "#0f7b0f",
      },
    },
    shape: {
      borderRadius: 8,
    },
    typography: sharedTypography,
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
            borderRadius: 4,
            textTransform: "none",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: "var(--q-control-fill)",
            borderRadius: 4,
          },
          notchedOutline: {
            borderColor: "var(--q-border)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: 8,
          },
        },
      },
    },
  });
}

export function AppThemeProvider({ children }) {
  const mode = useDocumentTheme();
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
