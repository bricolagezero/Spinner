import React, { useEffect, useState } from "react";
import { GameSettings } from "../types";
import WheelPanel from "../components/WheelPanel";
import { motion } from "framer-motion";

export default function Viewer({ settings }: { settings: GameSettings }) {
  const bgStyle =
    settings.backgroundMode === "gradient"
      ? { backgroundImage: `linear-gradient(${settings.bgGradient?.angle ?? 45}deg, ${settings.bgGradient?.from ?? "#020617"}, ${settings.bgGradient?.to ?? "#1e293b"})`,
          backgroundSize: "cover", backgroundPosition: "center" }
      : settings.backgroundUrl
      ? { backgroundImage: `url(${settings.backgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
      : {};

  return (
    <div className="min-h-screen w-full relative overflow-hidden text-white" style={bgStyle}>
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/50" />
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-6 py-6 flex flex-col gap-6 min-h-screen">
        <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="max-w-2xl rounded-2xl bg-black/35 backdrop-blur-md p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight drop-shadow-sm">{settings.title}</h1>
          {settings.subtitle && <p className="mt-2 text-base md:text-lg opacity-90">{settings.subtitle}</p>}
        </motion.div>

        <div className="flex-1 flex items-center justify-center">
          <div className="rounded-3xl bg-black/25 backdrop-blur-md p-6 md:p-10 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <WheelPanel settings={settings} setSettings={() => {}} sleekMode />
          </div>
        </div>

        {settings.footer && (
          <div className="pt-2">
            <div className="rounded-t-2xl bg-black/30 backdrop-blur-md text-center text-sm opacity-90 py-2">
              {settings.footer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
