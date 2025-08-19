import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getGame } from "../utils/api";
import { GameSettings } from "../types";
import WheelPanel from "../components/WheelPanel";
import { motion } from "framer-motion";

export default function ViewerPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);

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

  useEffect(() => {
    if (!timerActive || timeLeft === null || timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, timerActive]);

  if (loading) return <div className="min-h-screen flex justify-center items-center">Loading…</div>;
  if (err) return <div className="min-h-screen flex justify-center items-center text-red-500">{err}</div>;
  if (!settings) return null;

  const bgStyle = settings.backgroundUrl
    ? {
        backgroundImage: `url(${settings.backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};

  return (
    <div className="min-h-screen flex bg-slate-900" style={bgStyle}>
      <div className="flex-1 p-6 md:p-8 lg:p-12 flex relative">
        {/* Countdown Timer */}
        {settings.timerEnabled && timerActive && timeLeft !== null && (
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 z-20">
            <div className="text-white text-2xl font-mono">
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
              {String(timeLeft % 60).padStart(2, '0')}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          {/* Header in top left */}
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
            className="mb-8"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2 drop-shadow-lg">{settings.title}</h1>
            {settings.subtitle && (
              <motion.p 
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 100 }}
                className="text-lg md:text-xl opacity-90"
              >
                {settings.subtitle}
              </motion.p>
            )}
          </motion.div>
          
          {/* Wheel in center */}
          <div className="flex-1 flex items-center justify-center">
            <WheelPanel 
              settings={settings} 
              setSettings={setSettings as any} 
              sleekMode={true}
              onSpinStart={() => {
                if (settings.timerEnabled) {
                  const totalSeconds = (settings.timerMinutes || 0) * 60 + (settings.timerSeconds || 0);
                  setTimeLeft(totalSeconds);
                  setTimerActive(true);
                }
              }}
              onSpinEnd={() => setTimerActive(false)}
            />
          </div>
          
          {/* Footer */}
          {settings.footer && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 px-4 py-3 bg-black/50 backdrop-blur-sm rounded-lg self-start"
            >
              <p className="m-0 text-sm opacity-80">{settings.footer}</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

