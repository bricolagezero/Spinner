import { useEffect, useState } from "react";
import { GameSettings } from "../types";
import WheelPanel from "./WheelPanel";
import { motion } from "framer-motion";

export default function PreviewModal({ settings }: { settings: GameSettings }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<GameSettings>(() => JSON.parse(JSON.stringify(settings)));
  useEffect(() => setLocal(JSON.parse(JSON.stringify(settings))), [settings]);

  const bgStyle =
    local.backgroundMode === "gradient"
      ? {
          backgroundImage: `linear-gradient(${local.bgGradient?.angle ?? 45}deg, ${local.bgGradient?.from ?? "#020617"}, ${local.bgGradient?.to ?? "#1e293b"})`,
          backgroundSize: "cover", backgroundPosition: "center",
        }
      : local.backgroundUrl
      ? { backgroundImage: `url(${local.backgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
      : {};

  return (
    <div>
      <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white">Open Preview</button>
      {open ? (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[1400px] w-full relative overflow-hidden">
            <div className="flex items-center justify-end h-20 px-4 border-b bg-white/80 backdrop-blur">
              <button type="button" className="px-4 py-2 rounded-lg bg-slate-900 text-white" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="p-0">
              <div className="min-h-[60vh] w-full text-white relative" style={bgStyle}>
                <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/50" />
                <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 py-6 flex flex-col gap-6 min-h-[60vh]">
                  <motion.div
                    initial={{ x: -40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                    className="max-w-2xl rounded-2xl bg-black/35 backdrop-blur-md p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)]"
                  >
                    <h1 className="text-4xl md:text-5xl font-extrabold leading-tight drop-shadow-sm">{local.title}</h1>
                    {local.subtitle && <p className="mt-2 text-base md:text-lg opacity-90">{local.subtitle}</p>}
                  </motion.div>
                  <div className="flex items-center justify-center py-2">
                    <div className="rounded-3xl bg-black/25 backdrop-blur-md p-6 md:p-10 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
                      <WheelPanel settings={local} setSettings={setLocal as any} sleekMode />
                    </div>
                  </div>
                  {local.footer && (
                    <div className="mt-2">
                      <div className="rounded-xl bg-black/30 backdrop-blur-md px-4 py-2 inline-block">
                        <p className="text-sm opacity-90 m-0">{local.footer}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
