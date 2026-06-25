import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Note: the `?p=...` query param emitted by public/404.html is restored
// by the inline script in index.html so the router sees the original path.

const appRoot = document.getElementById("root");
if (appRoot === null) {
  throw new Error("Application root is missing from initial HTML page");
}

createRoot(appRoot).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
