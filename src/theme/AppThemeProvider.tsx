import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const appTheme = createTheme({
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily:
      '"Segoe UI Variable", "Microsoft YaHei UI", "PingFang SC", system-ui, sans-serif',
  },
  palette: {
    mode: "light",
    primary: {
      main: "#3fa49b",
    },
    secondary: {
      main: "#607d8b",
    },
    background: {
      default: "#f4f7f6",
      paper: "#ffffff",
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
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

export function AppThemeProvider({ children }) {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
