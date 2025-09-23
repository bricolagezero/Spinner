import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const AdminPage = lazy(() => import("./pages/Admin"));
const EditorPage = lazy(() => import("./pages/Editor"));
const ViewerPage = lazy(() => import("./pages/Viewer"));

export default function App() {
  useEffect(() => {
    const stored = localStorage.getItem("app:fontSizePx");
    if (stored) {
      const value = /^\d+$/.test(stored) ? `${stored}px` : stored;
      document.documentElement.style.setProperty("--app-font-size", value);
    }
  }, []);

  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <Routes>
        {/* Admin list */}
        <Route path="/admin" element={<AdminPage />} />

        {/* Editor */}
        <Route path="/admin/edit/:slug" element={<EditorPage />} />

        {/* Public viewer */}
        <Route path="/game/:slug" element={<ViewerPage />} />

        {/* Default → admin */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  );
}
