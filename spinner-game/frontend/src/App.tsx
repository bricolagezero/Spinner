import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const AdminPage = lazy(() => import("./pages/Admin"));
const EditorPage = lazy(() => import("./pages/Editor"));
const ViewerPage = lazy(() => import("./pages/Viewer"));

export default function App() {
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
