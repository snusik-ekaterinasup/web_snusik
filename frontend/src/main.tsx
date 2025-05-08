// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { Provider } from "react-redux"; // Импортируем Provider
import { store } from "./app/store"; // Импортируем наш созданный store

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      {" "}
      {/* Оборачиваем App в Provider и передаем ему store */}
      <App />
    </Provider>
  </React.StrictMode>
);
