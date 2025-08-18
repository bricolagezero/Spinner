import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";

// --- Inline global styles (we removed external index.css and Tailwind CDN) ---
const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif;
    background: #0b1220;
    color: #ffffff;
  }
  button { cursor: pointer; }
`;
const style = document.createElement("style");
style.setAttribute("data-inline-global", "true");
style.textContent = globalStyles;
document.head.appendChild(style);
// ---------------------------------------------------------------------------

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
