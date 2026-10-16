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
        main: isDark ? "#80bdfb" : "#0059a2",
        contrastText: isDark ? "#101c28" : "#f4f9ff",
      },
      secondary: {
        main: isDark ? "#e3e8ee" : "#414951",
      },
      background: {
        default: isDark ? "#0e1217" : "#f0f4f9",
        paper: isDark ? "#161b21" : "#f8fafd",
      },
      text: {
        primary: isDark ? "#e3e8ee" : "#212a33",
        secondary: isDark ? "#c5ced6" : "#414951",
      },
      divider: isDark ? "#3a4450" : "#c5ced6",
      error: {
        main: isDark ? "#f69b94" : "#9e2225",
      },
      warning: {
        main: isDark ? "#eccd8c" : "#6f4200",
      },
      success: {
        main: isDark ? "#a0d4a0" : "#135d1d",
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
