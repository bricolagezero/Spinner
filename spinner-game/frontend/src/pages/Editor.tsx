import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getGame, updateGame } from "../utils/api";
import { GameSettings } from "../types";
import WheelPanel from "../components/WheelPanel";
import SliceEditor from "../components/SliceEditor";
import PreviewModal from "../components/PreviewModal";
import { defaultSettings } from "../utils/defaults";

export default function EditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setLoading(true);
      setErr(null);
      try {
        if (slug === 'new') {
          // Create new spinner
          setSettings(defaultSettings());
        } else {
          const g = await getGame(slug);
          setSettings(g.settings);
        }
      } catch (e: any) {
        setErr(e.message || "Failed to load spinner");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  async function onSave() {
    if (!settings) return;
    try {
      await updateGame(slug!, settings, adminPassword);
      alert("Saved successfully!");
      nav("/admin");
    } catch (e: any) {
      alert(e.message || "Save failed");
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (err) return <div style={{ padding: 24, color: "crimson" }}>{err}</div>;
  if (!settings) return null;

  const tabs = ["Basics", "Slices", "Preview"];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <Link to="/admin" style={{ color: "#8ab4ff" }}>← Back to Admin</Link>
        <h2 style={{ margin: 0 }}>Editor: {settings.title}</h2>
        <button onClick={onSave} style={{ marginLeft: "auto", padding: "10px 16px", borderRadius: 10 }}>
          Save
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: activeTab === i ? "#2563eb" : "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "none",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 0 && (
        <div style={{ background: "rgba(255,255,255,0.05)", padding: 24, borderRadius: 12 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8 }}>
              Title:
              <input
                value={settings.title || ""}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                style={{ display: "block", width: "100%", padding: 8, borderRadius: 6, border: "1px solid #444", marginTop: 4 }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8 }}>
              Subtitle:
              <input
                value={settings.subtitle || ""}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                style={{ display: "block", width: "100%", padding: 8, borderRadius: 6, border: "1px solid #444", marginTop: 4 }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 8 }}>
              Admin Password:
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                style={{ display: "block", width: "100%", padding: 8, borderRadius: 6, border: "1px solid #444", marginTop: 4 }}
              />
            </label>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div>
          <button
            onClick={() => {
              const newSlice = {
                id: Math.random().toString(36).slice(2, 9),
                label: `Item ${settings.slices.length + 1}`,
                color: "#" + Math.floor(Math.random()*16777215).toString(16),
                outcomeText: "",
                outcomeImageUrl: "",
                disabled: false,
              };
              setSettings({ ...settings, slices: [...settings.slices, newSlice] });
            }}
            style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 8, background: "#2563eb" }}
          >
            Add Slice
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {settings.slices.map((slice, i) => (
              <SliceEditor
                key={slice.id}
                slice={slice}
                index={i}
                onChange={(patch) => {
                  const newSlices = [...settings.slices];
                  newSlices[i] = { ...slice, ...patch };
                  setSettings({ ...settings, slices: newSlices });
                }}
                onRemove={() => {
                  setSettings({ ...settings, slices: settings.slices.filter((_, idx) => idx !== i) });
                }}
                adminPassword={adminPassword}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div>
          <PreviewModal settings={settings} />
          <div style={{ marginTop: 24 }}>
            <WheelPanel settings={settings} setSettings={setSettings as any} />
          </div>
        </div>
      )}
    </div>
  );
}
