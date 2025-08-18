// spinner-game/frontend/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// --- Inline global styles to avoid external index.css ---
const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif;
    background: #0b1220; /* fallback bg; change to your gradient if you like */
    color: #ffffff;
  }
  button { cursor: pointer; }
`;
const style = document.createElement("style");
style.setAttribute("data-inline-global", "true");
style.textContent = globalStyles;
document.head.appendChild(style);
// -------------------------------------------------------

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
