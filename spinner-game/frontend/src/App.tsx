import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate } from "react-router-dom";
import Admin from "./pages/Admin";
import Viewer from "./pages/Viewer";
import EditorShell from "./pages/EditorShell";
import { GameSettings } from "./types";
import { apiUrl, safeJson } from "./utils/api";

const makeDefaults = (n = 8): GameSettings => ({
  title: "Spin Challenge",
  subtitle: "Put reps on the spot",
  footer: "",
  backgroundMode: "image",
  backgroundUrl: "",
  bgGradient: { from: "#020617", to: "#1e293b", angle: 45 },
  allowRepeats: true,
  timerEnabled: false,
  timerSeconds: 10,
  slices: Array.from({ length: n }, (_, i) => ({
    id: Math.random().toString(36).slice(2, 9),
    label: "New Item",
    color: ["#2563eb", "#16a34a", "#f59e0b", "#dc2626"][i % 4],
  })),
});

function EditorRoute() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<GameSettings | null>(null);

  useEffect(() => {
    if (!slug) { setSettings(makeDefaults()); return; }
    (async () => {
      try {
        const res = await fetch(apiUrl(`games/${slug}`), { headers: { Accept: "application/json" }, credentials: "include" });
        const json = await safeJson(res);
        setSettings(json?.settings || makeDefaults());
      } catch { setSettings(makeDefaults()); }
    })();
  }, [slug]);

  if (!settings) return null;
  return <EditorShell initialSettings={settings} initialSlug={slug || null} />;
}

function ViewerRoute() {
  const { slug } = useParams();
  const [settings, setSettings] = useState<GameSettings | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiUrl(`games/${slug}`), { headers: { Accept: "application/json" } });
        const json = await safeJson(res);
        setSettings(json?.settings);
      } catch { setSettings(null); }
    })();
  }, [slug]);

  if (!settings) return null;
  return <Viewer settings={settings} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/spinner/admin" element={<Admin />} />
        <Route path="/spinner/admin/edit/:slug" element={<EditorRoute />} />
        <Route path="/spinner/admin/new" element={<EditorRoute />} />
        <Route path="/spinner/game/:slug" element={<ViewerRoute />} />
        {/* fallback */}
        <Route path="*" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

