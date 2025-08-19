import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GameSettings } from "../types";

// small helpers
const DEFAULT_PALETTE = ["#ff4d4f", "#ffd43b", "#40c057", "#4dabf7", "#845ef7", "#f783ac", "#ffa94d", "#2f9e44"];
const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const v = parseInt(f, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b].map(n => n.toString(16).padStart(2, "0")).join("")}`;
const desaturate = (hex: string) => {
  try {
    const [r, g, b] = hexToRgb(hex);
    const m = (r + g + b) / 3;
    const mix = (x: number) => Math.round((x + 2 * m) / 3);
    return rgbToHex(mix(r), mix(g), mix(b));
  } catch { return "#9ca3af"; }
};

export default function WheelPanel({
  settings,
  setSettings,
  sleekMode = false,
}: {
  settings: GameSettings;
  setSettings: (u: any) => void;
  sleekMode?: boolean;
}) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // responsive size
  const [size, setSize] = useState(600);
  useEffect(() => {
    const onResize = () => setSize(Math.max(480, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.8)));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const radius = Math.floor(size * 0.45);
  const cx = size / 2, cy = size / 2;

  const activeSlices = useMemo(() => settings.slices.filter((s) => !s.disabled), [settings.slices]);
  const sliceAngle = 360 / Math.max(1, settings.slices.length);

  // audio ticks
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);
  const playTick = () => {
    const ctx = audioCtxRef.current; if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = 1100; g.gain.value = 0.05;
    o.connect(g); g.connect(ctx.destination); o.start();
    setTimeout(() => { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08); o.stop(ctx.currentTime + 0.09); }, 10);
  };
  const playWhoosh = () => {
    const ctx = audioCtxRef.current; if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(220, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.9);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.0);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 1.0);
  };

  const pickIndex = () => {
    const candidates = settings.allowRepeats ? settings.slices : activeSlices;
    if (candidates.length === 0) return 0;
    const id = candidates[Math.floor(Math.random() * candidates.length)].id;
    return settings.slices.findIndex((s) => s.id === id);
  };

  const spin = () => {
    if (spinning) return;
    if ((!settings.allowRepeats && activeSlices.length === 0) || settings.slices.length === 0) return;
    const idx = pickIndex();
    const targetCenter = idx * sliceAngle + sliceAngle / 2;
    const spins = 6 + Math.floor(Math.random() * 3);
    const finalRotation = spins * 360 + (360 - targetCenter);
    setSpinning(true);
    setResultIndex(idx);
    setCountdown(null);
    playWhoosh();
    let ticks = 0;
    const t = setInterval(() => { playTick(); if (++ticks > 22) clearInterval(t); }, 120);
    requestAnimationFrame(() => setRotation((r) => r + finalRotation));
  };

  const wheelRef = useRef<HTMLDivElement>(null);
  const wheelStyle: React.CSSProperties = {
    width: size,
    height: size,
    transform: "rotate(" + rotation + "deg)",
    transition: spinning ? "transform 3.8s cubic-bezier(0.17,0.67,0.32,1.29)" : "none",
  };

  // normalize residual rotation [0..360)
  const rotationResidual = ((rotation % 360) + 360) % 360;

  useEffect(() => {
    const el = wheelRef.current; if (!el) return;
    const onEnd = () => {
      if (!spinning) return;
      setSpinning(false);
      setShowModal(true);
      if (settings.timerEnabled) setCountdown(settings.timerSeconds);
      if (!settings.allowRepeats && resultIndex != null) {
        const next = settings.slices.map((s, i) => (i === resultIndex ? { ...s, disabled: true } : s));
        setSettings({ ...settings, slices: next });
      }
      // quick confetti
      const root = document.createElement("div");
      root.style.position = "fixed"; root.style.inset = "0"; root.style.pointerEvents = "none";
      document.body.appendChild(root);
      for (let i = 0; i < 60; i++) {
        const p = document.createElement("div");
        p.style.position = "absolute";
        p.style.left = Math.random() * 100 + "%"; p.style.top = "-10px";
        p.style.width = "8px"; p.style.height = "14px";
        p.style.background = DEFAULT_PALETTE[Math.floor(Math.random() * DEFAULT_PALETTE.length)];
        p.style.opacity = "0.9";
        p.style.transform = "rotate(" + Math.random() * 360 + "deg)";
        p.style.transition = "transform 1.2s linear, top 1.2s linear, opacity 1.2s linear";
        root.appendChild(p);
        requestAnimationFrame(() => {
          p.style.top = "110%";
          p.style.transform = "translate(" + ((Math.random() * 2 - 1) * 200) + "px,0) rotate(" + (360 + Math.random() * 360) + "deg)";
          p.style.opacity = "0.2";
        });
      }
      setTimeout(() => document.body.removeChild(root), 1300);
    };
    el.addEventListener("transitionend", onEnd);
    return () => el.removeEventListener("transitionend", onEnd);
  }, [spinning, resultIndex, settings]);

  useEffect(() => {
    if (countdown == null || countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => (c == null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const current = resultIndex != null ? settings.slices[resultIndex] : null;

  // geometry
  const slicePath = (index: number) => {
    const a0 = (index * sliceAngle * Math.PI) / 180;
    const a1 = ((index + 1) * sliceAngle * Math.PI) / 180;
    const x0 = cx + radius * Math.sin(a0), y0 = cy - radius * Math.cos(a0);
    const x1 = cx + radius * Math.sin(a1), y1 = cy - radius * Math.cos(a1);
    return `M${cx},${cy} L${x0},${y0} A${radius},${radius} 0 0,1 ${x1},${y1} Z`;
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* right-side SPIN */}
      <button
        onClick={spin}
        disabled={spinning || (!settings.allowRepeats && activeSlices.length === 0)}
        className={`absolute -right-6 md:-right-12 lg:-right-20 top-1/2 -translate-y-1/2
                    w-28 h-28 lg:w-36 lg:h-36 rounded-full grid place-items-center
                    text-black font-extrabold text-base lg:text-lg
                    shadow-[0_0_35px_rgba(255,255,0,0.7)] border-4 border-yellow-200
                    ${spinning ? "bg-gray-300" : "bg-yellow-400 hover:bg-yellow-300"}`}
        aria-label="Spin" title="Spin"
      >
        <div className="text-3xl lg:text-4xl">⟳</div>
        <div>SPIN</div>
      </button>

      {/* pointer (flipped + shadow) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-8 z-20"
        style={{
          width: 0,
          height: 0,
          borderLeft: "16px solid transparent",
          borderRight: "16px solid transparent",
          borderBottom: "28px solid rgba(255,255,255,0.98)",
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
          transform: "rotate(180deg)",
        }}
      />

      {/* wheel */}
      <div
        ref={wheelRef}
        style={wheelStyle}
        className="relative rounded-full overflow-hidden select-none shadow-[0_0_80px_10px_rgba(255,255,255,0.15)] bg-[radial-gradient(circle_at_30%_30%,#0b1220,transparent_60%)] ring-8 ring-white/10"
      >
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_40px_rgba(255,255,255,0.15)]" />
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
          {settings.slices.map((s, i) => (
            <motion.path
              key={s.id}
              d={slicePath(i)}
              fill={s.disabled ? desaturate(s.color) : s.color}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02, type: "spring", stiffness: 140, damping: 18 }}
            />
          ))}

          {/* labels rotate with wheel; winner snaps horizontal */}
          {settings.slices.map((s, i) => {
            const angle = i * sliceAngle + sliceAngle / 2;
            const rL = radius * 0.72;
            const rad = (angle * Math.PI) / 180;
            const rx = cx + rL * Math.sin(rad);
            const ry = cy - rL * Math.cos(rad);
            const isWinner = resultIndex === i && !spinning;
            const counter = isWinner ? -rotationResidual : 0;
            return (
              <g key={`${s.id}-label`}>
                <g transform={`translate(${rx},${ry}) rotate(${counter}) translate(${-rx},${-ry})`}>
                  <text
                    x={rx}
                    y={ry}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.max(12, Math.floor(size / 30))}
                    fill="#fff"
                    style={isWinner ? { fontWeight: 700, filter: "drop-shadow(0 0 6px rgba(255,255,255,0.8))", transition: "transform 220ms ease-out" } : undefined}
                  >
                    {s.label}
                  </text>
                </g>
              </g>
            );
          })}

          <circle cx={cx} cy={cy} r={size * 0.04} fill="#111" />
          <circle cx={cx} cy={cy} r={size * 0.028} fill="#222" />
        </svg>
      </div>

      {/* outcome modal */}
      {showModal && current && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 p-4 z-[9998]">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white text-black rounded-2xl p-6 md:p-8 max-w-[80vw] max-h-[80vh] w-full flex flex-col items-center overflow-auto"
          >
            <h2 className="text-3xl font-bold mb-4 text-center">{current.label}</h2>
            {current.outcomeImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.outcomeImageUrl}
                className="mb-4 rounded-xl"
                style={{ maxHeight: "45vh", transform: "scale(" + (current.outcomeImageScale ?? 0.6) + ")" }}
                alt=""
              />
            )}
            {current.outcomeText && (
              <p className="mb-4 text-center" style={{ fontSize: current.outcomeFontSize ?? 20 }}>
                {current.outcomeText}
              </p>
            )}
            {settings.timerEnabled && countdown != null && (
              <div className="relative mt-2">
                <div className="relative w-24 h-24 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-3xl font-bold text-pink-600 shadow-[0_0_30px_rgba(255,255,255,0.2)] animate-pulse">
                  {countdown}
                  <svg className="absolute inset-0" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="6" />
                    <circle
                      cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="6"
                      strokeDasharray="289"
                      strokeDashoffset={(1 - countdown / settings.timerSeconds) * 289}
                    />
                  </svg>
                </div>
              </div>
            )}
            <button onClick={() => setShowModal(false)} className="mt-6 px-6 py-3 bg-pink-600 rounded-xl text-white text-lg">
              Spin Again
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
}
