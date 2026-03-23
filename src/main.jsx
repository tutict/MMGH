import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n";

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);

root.render(
  <I18nProvider>
    <App />
  </I18nProvider>
);
