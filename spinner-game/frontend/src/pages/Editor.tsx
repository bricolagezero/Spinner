import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getGame, updateGame } from "../utils/api";
import WheelPanel from "../components/WheelPanel";

export default function EditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setLoading(true);
      setErr(null);
      try {
        const g = await getGame(slug);
        setSettings(g.settings);
      } catch (e: any) {
        setErr(e.message || "Failed to load spinner");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  async function onSave() {
    if (!slug || !settings) return;
    try {
      await updateGame(slug, settings);
      alert("Saved");
    } catch (e: any) {
      alert(e.message || "Save failed");
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <Link to="/admin" style={{ color: "#8ab4ff" }}>← Back to Admin</Link>
        <h2 style={{ margin: 0 }}>Editor: {slug}</h2>
      </div>

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: "crimson" }}>{err}</div>}
      {!loading && settings && (
        <>
          <div style={{ marginBottom: 12 }}>
            <label>
              Title:{" "}
              <input
                value={settings.title || ""}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #444", width: 320 }}
              />
            </label>
          </div>

          <div style={{marginTop:24}}>
            <WheelPanel settings={settings} setSettings={setSettings as any} />
          </div>

          <button onClick={onSave} style={{ padding: "10px 16px", borderRadius: 10 }}>
            Save
          </button>
        </>
      )}
    </div>
  );
}
