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

  if (loading) return <div className="min-h-screen flex justify-center items-center">Loading…</div>;
  if (err) return <div className="min-h-screen flex justify-center items-center text-red-500">{err}</div>;
  if (!settings) return null;

  const bgStyle = settings.backgroundMode === "gradient"
    ? {
        backgroundImage: `linear-gradient(${settings.bgGradient?.angle ?? 45}deg, ${settings.bgGradient?.from ?? "#020617"}, ${settings.bgGradient?.to ?? "#1e293b"})`,
      }
    : settings.backgroundUrl
    ? {
        backgroundImage: `url(${settings.backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};

  return (
    <div className="min-h-screen flex flex-col bg-slate-900" style={bgStyle}>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2 drop-shadow-lg">{settings.title}</h1>
          {settings.subtitle && <p className="text-lg md:text-xl opacity-90">{settings.subtitle}</p>}
        </div>
        
        <WheelPanel settings={settings} setSettings={setSettings as any} sleekMode={true} />
        
        {settings.footer && (
          <div className="mt-8 px-4 py-3 bg-black/50 backdrop-blur-sm rounded-lg">
            <p className="m-0 text-sm opacity-80">{settings.footer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
  );
}
