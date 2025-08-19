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

  const pageBgStyle =
    settings.backgroundMode === 'image' && settings.backgroundUrl
      ? { backgroundImage: `url(${settings.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : undefined;

  return (
    <div className="min-h-screen flex bg-slate-900" style={pageBgStyle}>
      <div className="flex-1 p-4 md:p-6 lg:p-8 flex relative">
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
          {/* Header - smaller title in dark translucent rounded container */}
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
            className="mb-4"
          >
            <div className="rounded-2xl bg-black/50 px-4 py-3 w-full md:w-1/2">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-1 drop-shadow-lg break-words">{settings.title}</h1>
              {settings.subtitle && (
                <motion.p
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 100 }}
                  className="text-base md:text-lg opacity-90 m-0 break-words"
                >
                  {settings.subtitle}
                </motion.p>
              )}
            </div>
          </motion.div>
          
          {/* Wheel in center */}
          <div className="flex-1 flex items-center justify-center overflow-visible">
            <WheelPanel 
              settings={settings} 
              setSettings={setSettings as any} 
              sleekMode={true}
              onSpinEnd={() => {
                if (settings.timerEnabled) {
                  const totalSeconds = (settings.timerMinutes || 0) * 60 + (settings.timerSeconds || 0);
                  setTimeLeft(totalSeconds);
                  setTimerActive(true);
                }
              }}
            />
          </div>
          
          {/* Footer - fixed bottom center */}
          {settings.footer && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="fixed bottom-4 inset-x-0 z-20 flex justify-center px-4"
            >
              <div className="px-4 py-3 bg-black/50 backdrop-blur-sm rounded-lg">
                <p className="m-0 text-sm opacity-90 text-center">{settings.footer}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

