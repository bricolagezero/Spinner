import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [showCompletion, setShowCompletion] = useState(false);

  // responsive size - make it smaller
  const [size, setSize] = useState(500);
  useEffect(() => {
    const onResize = () => setSize(Math.max(400, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.65)));
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
      if (settings.timerEnabled) {
        const totalSeconds = (settings.timerMinutes || 0) * 60 + (settings.timerSeconds || 0);
        setCountdown(totalSeconds);
      }
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
  }, [spinning, resultIndex, settings, setSettings]);

  useEffect(() => {
    if (countdown == null || countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => (c == null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const current = resultIndex != null ? settings.slices[resultIndex] : null;

  // Check if all slices are disabled (activity complete)
  useEffect(() => {
    if (!settings.allowRepeats && settings.slices.length > 0 && settings.slices.every(s => s.disabled)) {
      setShowCompletion(true);
    }
  }, [settings.slices, settings.allowRepeats]);

  const handleRestart = () => {
    const resetSlices = settings.slices.map(s => ({ ...s, disabled: false }));
    setSettings({ ...settings, slices: resetSlices });
    setShowCompletion(false);
  };

  // geometry
  const slicePath = (index: number) => {
    const a0 = (index * sliceAngle * Math.PI) / 180;
    const a1 = ((index + 1) * sliceAngle * Math.PI) / 180;
    const x0 = cx + radius * Math.sin(a0), y0 = cy - radius * Math.cos(a0);
    const x1 = cx + radius * Math.sin(a1), y1 = cy - radius * Math.cos(a1);
    return `M${cx},${cy} L${x0},${y0} A${radius},${radius} 0 0,1 ${x1},${y1} Z`;
  };

  // Helper to wrap text for slices
  const wrapText = (text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length > maxWidth / 10) { // Rough estimate
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* left-side SPIN button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        onClick={spin}
        disabled={spinning || (!settings.allowRepeats && activeSlices.length === 0)}
        className={`absolute -left-24 md:-left-32 top-1/2 -translate-y-1/2
                    w-24 h-24 md:w-28 md:h-28 rounded-full grid place-items-center
                    text-black font-extrabold text-sm md:text-base
                    shadow-[0_0_35px_rgba(255,255,0,0.7)] border-4 border-yellow-200
                    transition-all duration-300
                    ${spinning ? "bg-gray-300 cursor-not-allowed" : "bg-yellow-400 hover:bg-yellow-300 hover:scale-105"}`}
        aria-label="Spin" title="Spin"
      >
        <div className="text-2xl md:text-3xl">⟳</div>
        <div>SPIN</div>
      </motion.button>

      {/* pointer (larger and centered) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-12 z-20"
        style={{
          width: 0,
          height: 0,
          borderLeft: "24px solid transparent",
          borderRight: "24px solid transparent",
          borderBottom: "40px solid rgba(255,255,255,0.98)",
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.6))",
          transform: "translateX(-50%) rotate(180deg)",
        }}
      />

      {/* wheel */}
      <div
        ref={wheelRef}
        style={wheelStyle}
        className="relative rounded-full overflow-hidden select-none spinner-shadow bg-gradient-radial from-slate-800 to-slate-900 ring-8 ring-white/10"
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
              className="stroke-slate-800 stroke-1"
            />
          ))}

          {/* icons and labels */}
          {settings.slices.map((s, i) => {
            const angle = i * sliceAngle + sliceAngle / 2;
            const rad = (angle * Math.PI) / 180;
            
            // Icon positioning (closer to center)
            const iconRadius = radius * 0.45;
            const iconX = cx + iconRadius * Math.sin(rad);
            const iconY = cy - iconRadius * Math.cos(rad);
            
            // Text positioning (further out)
            const textRadius = radius * 0.7;
            const textX = cx + textRadius * Math.sin(rad);
            const textY = cy - textRadius * Math.cos(rad);
            
            const isWinner = resultIndex === i && !spinning;
            const counter = isWinner ? -rotationResidual : 0;
            
            const fontSize = Math.max(10, Math.floor(size / 35));
            const lines = wrapText(s.label, sliceAngle * 2);
            
            return (
              <motion.g 
                key={`${s.id}-content`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                {/* Icon or Number */}
                {s.iconUrl ? (
                  <g transform={`translate(${iconX},${iconY}) rotate(${counter}) translate(${-iconX},${-iconY})`}>
                    <image
                      href={s.iconUrl}
                      x={iconX - 20}
                      y={iconY - 20}
                      width="40"
                      height="40"
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </g>
                ) : (
                  <g transform={`translate(${iconX},${iconY}) rotate(${counter}) translate(${-iconX},${-iconY})`}>
                    <text
                      x={iconX}
                      y={iconY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={Math.floor(size / 25)}
                      fill="#fff"
                      opacity="0.5"
                      style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 'bold' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </text>
                  </g>
                )}
                
                {/* Label */}
                <g transform={`translate(${textX},${textY}) rotate(${counter}) translate(${-textX},${-textY})`}>
                  {lines.map((line, lineIndex) => (
                    <text
                      key={lineIndex}
                      x={textX}
                      y={textY + (lineIndex - (lines.length - 1) / 2) * fontSize * 1.2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={fontSize}
                      fill="#fff"
                      style={{ fontFamily: 'Roboto, sans-serif' }}
                      className={isWinner ? "font-bold drop-shadow-[0_0_6px_rgba(255,255,255,0.8)] transition-transform duration-200 ease-out" : "drop-shadow-sm"}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              </motion.g>
            );
          })}

          <circle cx={cx} cy={cy} r={size * 0.04} fill="#111" className="drop-shadow-lg" />
          <circle cx={cx} cy={cy} r={size * 0.028} fill="#222" />
        </svg>
      </div>

      {/* outcome modal with animated border */}
      <AnimatePresence>
        {showModal && current && (
          <motion.div 
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              className="relative"
            >
              {/* Animated gradient border */}
              <div className="absolute inset-0 rounded-2xl p-1 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 animate-gradient-rotate" />
              </div>
              
              {/* Content */}
              <div className="relative bg-white text-black rounded-2xl p-6 md:p-8 max-w-[80vw] max-h-[80vh] w-full max-w-2xl flex flex-col items-center overflow-auto shadow-2xl">
                {settings.timerEnabled && countdown != null && (
                  <div className="absolute -top-24 left-1/2 -translate-x-1/2">
                    <div className="bg-black/80 backdrop-blur-md rounded-2xl px-6 py-3 text-white font-bold text-2xl shadow-[0_0_30px_rgba(255,255,255,0.3)] animate-pulse" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                    </div>
                  </div>
                )}
                <h2 className="text-3xl font-bold mb-4 text-center" style={{ fontFamily: 'Roboto, sans-serif' }}>{current.label}</h2>
                {current.outcomeImageUrl && (
                  <img
                    src={current.outcomeImageUrl}
                    className="mb-4 rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform"
                    style={{ maxHeight: "45vh", transform: "scale(" + (current.outcomeImageScale ?? 0.6) + ")" }}
                    alt=""
                    onClick={() => window.open(current.outcomeImageUrl, '_blank')}
                  />
                )}
                {current.outcomeText && (
                  <p className="mb-4 text-center" style={{ fontSize: current.outcomeFontSize ?? 20, fontFamily: 'Roboto, sans-serif' }}>
                    {current.outcomeText}
                  </p>
                )}
                <button 
                  onClick={() => setShowModal(false)} 
                  className="mt-6 px-6 py-3 bg-pink-600 hover:bg-pink-700 rounded-xl text-white text-lg font-semibold transition-colors shadow-lg"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  Spin Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Complete Modal */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div 
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 10, stiffness: 100 }}
              className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-3xl p-8 md:p-12 max-w-lg text-center shadow-2xl"
            >
              <motion.h2 
                className="text-4xl md:text-5xl font-bold mb-6"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Activity Complete! 🎉
              </motion.h2>
              <p className="text-lg md:text-xl mb-8 opacity-90" style={{ fontFamily: 'Roboto, sans-serif' }}>
                Great job! You've completed all the spins.
              </p>
              <button 
                onClick={handleRestart} 
                className="px-8 py-4 bg-white text-orange-500 rounded-xl text-lg font-bold hover:scale-105 transition-transform shadow-lg"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Restart Activity
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

