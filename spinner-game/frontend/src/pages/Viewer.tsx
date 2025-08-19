import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getGame } from "../utils/api";

export default function ViewerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [game, setGame] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setLoading(true);
      setErr(null);
      try {
        const g = await getGame(slug);
        setGame(g);
      } catch (e: any) {
        setErr(e.message || "Failed to load game");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <Link to="/admin" style={{ color: "#8ab4ff" }}>← Back to Admin</Link>
        <h2 style={{ margin: 0 }}>Viewer: {slug}</h2>
      </div>

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: "crimson" }}>{err}</div>}
      {!loading && game && (
        <>
          <div>Title: {game.settings?.title}</div>
          <div>Slices: {game.settings?.slices?.length ?? 0}</div>
          {/* TODO: render your actual wheel UI here */}
        </>
      )}
    </div>
  );
}
