import React from "react";
import App from "./App";
import ReactDOM from "react-dom/client";
import {IonApp} from "@ionic/react";
import {IonReactRouter} from "@ionic/react-router";
import 'core-js/stable';
import 'regenerator-runtime/runtime';

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);

root.render(<IonApp><IonReactRouter><App /></IonReactRouter></IonApp>);

