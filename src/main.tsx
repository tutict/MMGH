import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n";
import { AppThemeProvider } from "./theme/AppThemeProvider";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element #root was not found.");
}

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <AppThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </AppThemeProvider>
  </React.StrictMode>
);