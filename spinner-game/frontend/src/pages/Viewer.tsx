import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getGame } from "../utils/api";
import { GameSettings } from "../types";
import WheelPanel from "../components/WheelPanel";

export default function ViewerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [settings, setSettings] = useState<GameSettings | null>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setLoading(true);
      setErr(null);
      try {
        const g = await getGame(slug);
        setSettings(g.settings);
      } catch (e: any) {
        setErr(e.message || "Failed to load game");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>Loading…</div>;
  if (err) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "crimson" }}>{err}</div>;
  if (!settings) return null;

  const bgStyle = settings.backgroundMode === "gradient"
    ? {
        backgroundImage: `linear-gradient(${settings.bgGradient?.angle ?? 45}deg, ${settings.bgGradient?.from ?? "#020617"}, ${settings.bgGradient?.to ?? "#1e293b"})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : settings.backgroundUrl
    ? {
        backgroundImage: `url(${settings.backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: "#0b1220" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", ...bgStyle }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 8 }}>{settings.title}</h1>
          {settings.subtitle && <p style={{ fontSize: 20, opacity: 0.9 }}>{settings.subtitle}</p>}
        </div>
        
        <WheelPanel settings={settings} setSettings={setSettings as any} sleekMode={true} />
        
        {settings.footer && (
          <div style={{ marginTop: 32, padding: 16, background: "rgba(0,0,0,0.5)", borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 14, opacity: 0.8 }}>{settings.footer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
