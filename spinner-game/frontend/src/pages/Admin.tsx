import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { createGame } from "../utils/api";
import { defaultSettings } from "../utils/defaults";

type GameListItem = { slug: string; updated_at?: string };

export default function AdminPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<GameListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [urlModalSlug, setUrlModalSlug] = useState<string | null>(null);
  const [qrModalSlug, setQrModalSlug] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/spinner/api/games.php?path=games", { credentials: "include" });
      if (!res.ok) throw new Error(`List failed: ${res.status}`);
      const data = await res.json();
      const games = data.games ?? [];
      setList(games);
      // Fetch titles for display
      (async () => {
        const entries: Record<string, string> = {};
        for (const g of games) {
          try {
            const r = await fetch(`/spinner/api/game.php?path=games&slug=${titles[g.slug] ?? g.slug}`, { credentials: "include" });
            const j = await r.json();
            entries[g.slug] = j?.settings?.title || g.slug;
          } catch {}
        }
        setTitles(entries);
      })();
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onNewSpinner() {
    try {
      // If you are not using PHP sessions (login.php), pass admin password here:
      // const slug = await createGame(defaultSettings(), "<YOUR_ADMIN_PASSWORD>");
      const name = window.prompt("Name your spinner:", "New Spin Game") || "New Spin Game";
      const slug = await createGame(defaultSettings(name));
      nav(`/admin/edit/${slug}`); // basename adds /spinner automatically
    } catch (e: any) {
      alert(e.message || "Failed to create spinner");
      load();
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Spinners</h1>
          <div style={{ opacity: 0.7 }}>Create, edit, and share</div>
        </div>

        <button
          onClick={onNewSpinner}
          style={{
            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            color: "#fff",
            border: "none",
            padding: "12px 18px",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            boxShadow: "0 6px 18px rgba(0,0,0,.25)",
          }}
          aria-label="Create a new spinner"
          title="Create a new spinner"
        >
          + New Spinner
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        {loading && <div>Loading…</div>}
        {error && <div style={{ color: "crimson" }}>{error}</div>}

        {!loading && !list.length && <div style={{ opacity: 0.7 }}>No spinners yet.</div>}

        {!!list.length && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {list.map((g) => (
              <div
                key={titles[g.slug] ?? g.slug}
                style={{
                  borderRadius: 12,
                  padding: 16,
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.12)",
                  backdropFilter: "blur(4px)",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 16 }}>{titles[g.slug] ?? g.slug}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  {g.updated_at ? new Date(g.updated_at).toLocaleString() : "—"}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <button onClick={() => nav(`/admin/edit/${titles[g.slug] ?? g.slug}`)}>Edit</button>
                  <button onClick={() => window.open(`/spinner/game/${titles[g.slug] ?? g.slug}`, "_blank")}>View URL</button>
                  <button onClick={() => nav(`/admin/qr/${titles[g.slug] ?? g.slug}`)}>View QR</button>
                  <button onClick={() => nav(`/admin/duplicate/${titles[g.slug] ?? g.slug}`)}>Duplicate</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
