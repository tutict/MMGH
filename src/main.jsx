import React from "react";
import App from "./App";
import ReactDOM from "react-dom/client";
import { IonApp } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import "core-js/stable";
import "regenerator-runtime/runtime";
import { I18nProvider } from "./i18n";

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);

root.render(
  <IonApp>
    <IonReactRouter>
      <I18nProvider>
        <App />
      </I18nProvider>
    </IonReactRouter>
  </IonApp>
);
