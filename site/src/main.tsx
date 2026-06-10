import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Restore SPA path captured by public/404.html (GitHub Pages deep-link trick).
const url = new URL(window.location.href);
const original = url.searchParams.get("p");
if (original) {
  url.searchParams.delete("p");
  window.history.replaceState(null, "", original + url.search + url.hash);
}

const appRoot = document.getElementById("root");
if (appRoot === null) {
  throw new Error("Application root is missing from initial HTML page");
}

createRoot(appRoot).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
