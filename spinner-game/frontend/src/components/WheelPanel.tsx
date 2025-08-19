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
  onSpinStart,
  onSpinEnd,
}: {
  settings: GameSettings;
  setSettings: (u: any) => void;
  sleekMode?: boolean;
  onSpinStart?: () => void;
  onSpinEnd?: () => void;
}) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [sliceCountdown, setSliceCountdown] = useState<number | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [viewedSlices, setViewedSlices] = useState<string[]>([]);

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

  // In the spin function, ensure wheel stops with slice under triangle
  const spin = () => {
    if (spinning) return;
    if ((!settings.allowRepeats && activeSlices.length === 0) || settings.slices.length === 0) return;
    
    // Call onSpinStart if provided
    onSpinStart?.();
    
    const idx = pickIndex();
    
    // Calculate rotation to center the winning slice under the triangle
    const sliceAngle = 360 / settings.slices.length;
    const sliceStartAngle = idx * sliceAngle;
    const sliceCenterAngle = sliceStartAngle + (sliceAngle / 2);
    
    // Adjust final rotation to center slice under triangle (which is at top/0 degrees)
    const spins = 6 + Math.floor(Math.random() * 3);
    const finalRotation = spins * 360 + (360 - sliceCenterAngle);
    
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
      
      // Call onSpinEnd if provided
      onSpinEnd?.();
      
      // Add 1-second delay before showing modal
      setTimeout(() => {
        setShowModal(true);
        if (settings.timerEnabled) {
          const totalSeconds = (settings.timerMinutes || 0) * 60 + (settings.timerSeconds || 0);
          setCountdown(totalSeconds);
        }
        // Set per-slice timer if available
        if (resultIndex != null && settings.slices[resultIndex].timerSeconds) {
          setSliceCountdown(settings.slices[resultIndex].timerSeconds);
        }
        // Mark slice as viewed
        if (resultIndex != null) {
          const sliceId = settings.slices[resultIndex].id;
          if (!viewedSlices.includes(sliceId)) {
            setViewedSlices(prev => [...prev, sliceId]);
          }
        }
        if (!settings.allowRepeats && resultIndex != null) {
          const next = settings.slices.map((s, i) => (i === resultIndex ? { ...s, disabled: true } : s));
          setSettings({ ...settings, slices: next });
        }
      }, 1000);
      
      // Confetti effect
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
  }, [spinning, resultIndex, settings, setSettings, viewedSlices]);

  useEffect(() => {
    if (countdown == null || countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => (c == null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  useEffect(() => {
    if (sliceCountdown == null || sliceCountdown <= 0) return;
    const id = setTimeout(() => setSliceCountdown((c) => (c == null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [sliceCountdown]);

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
    setViewedSlices([]);
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
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col">
      {/* Main content wrapper */}
      <div className="flex-grow">
        {/* Background image - responsive without cutting off buttons */}
        {settings.backgroundImage && (
          <div className="w-full flex justify-center mb-4">
            <div className="w-full max-w-4xl" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              <img 
                src={settings.backgroundImage} 
                alt="Wheel background"
                className="w-full h-full object-contain"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>
        )}

        {/* Wheel container */}
        <div className="relative mx-auto" style={{ width: size, height: size }}>
          {/* Triangle indicator - higher z-index */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-40 triangle-indicator">
            <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[40px] border-b-red-600"></div>
          </div>

          {/* SVG Wheel */}
          <svg width={size} height={size} className="drop-shadow-2xl">
            <g ref={wheelRef} style={wheelStyle}>
              {settings.slices.map((slice, i) => {
                const isViewed = viewedSlices.includes(slice.id);
                return (
                  <g key={slice.id}>
                    <path 
                      d={slicePath(i)} 
                      fill={isViewed ? desaturate(slice.color) : slice.color}
                      stroke="#333"
                      strokeWidth="2"
                      opacity={isViewed ? 0.5 : 1}
                    />
                    <g transform={`translate(${cx},${cy}) rotate(${i * sliceAngle + sliceAngle / 2})`}>
                      <text 
                        x="0" 
                        y={-radius * 0.7} 
                        textAnchor="middle"
                        fill="white"
                        fontSize="24"
                        fontWeight="bold"
                        className="drop-shadow-lg wheel-slice-text"
                      >
                        {i + 1}
                      </text>
                      <text 
                        x="0" 
                        y={-radius * 0.5} 
                        textAnchor="middle"
                        fill="white"
                        fontSize="14"
                        fontWeight="500"
                        className="drop-shadow wheel-slice-text"
                      >
                        {slice.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
            {/* Center cap */}
            <circle cx={cx} cy={cy} r={size * 0.06} fill="white" stroke="#333" strokeWidth="3" />
          </svg>
        </div>

        {/* Spin button */}
        <div className="text-center mt-8">
          <button
            onClick={spin}
            disabled={spinning || (!settings.allowRepeats && activeSlices.length === 0)}
            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {spinning ? 'Spinning...' : 'Spin the Wheel'}
          </button>
        </div>
      </div>

      {/* Footer - centered at bottom */}
      <footer className="mt-8 py-4 text-center text-sm text-gray-600">
        <p>&copy; 2024 Spinner Game. All rights reserved.</p>
      </footer>

      {/* Slice modal */}
      <AnimatePresence>
        {showModal && current && (
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 md:p-8 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              {/* Timers */}
              {settings.timerEnabled && countdown != null && (
                <div className="mb-4 text-lg font-semibold text-center">
                  Global Timer: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </div>
              )}
              
              {current.timerSeconds && sliceCountdown != null && sliceCountdown > 0 && (
                <div className="mb-4 text-lg font-semibold text-center text-purple-600">
                  Slice Timer: {Math.floor(sliceCountdown / 60)}:{String(sliceCountdown % 60).padStart(2, '0')}
                </div>
              )}
              
              <h2 className="text-2xl font-bold mb-4 text-center">{current.label}</h2>
              
              {current.outcomeImageUrl && (
                <div className="w-full flex justify-center mb-4">
                  <img 
                    src={current.outcomeImageUrl}
                    className="rounded-lg shadow-lg max-w-full h-auto"
                    style={{ 
                      maxHeight: '300px',
                      transform: `scale(${current.outcomeImageScale ?? 1})`
                    }}
                    alt=""
                  />
                </div>
              )}
              
              {current.outcomeText && (
                <p className="mb-4 text-center" style={{ fontSize: current.outcomeFontSize ?? 16 }}>
                  {current.outcomeText}
                </p>
              )}

              {/* Button based on whether all slices are viewed */}
              {viewedSlices.length === settings.slices.length ? (
                <button
                  onClick={() => {
                    setShowModal(false);
                    setShowCompletionModal(true);
                  }}
                  className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full font-semibold"
                >
                  Close
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSliceCountdown(null);
                    spin();
                  }}
                  className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full font-semibold"
                >
                  Spin Again
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Complete Modal */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
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
              >
                Activity Complete! 🎉
              </motion.h2>
              <p className="text-lg md:text-xl mb-8 opacity-90">
                Great job! You've completed all the spins.
              </p>
              <button 
                onClick={handleRestart} 
                className="px-8 py-4 bg-white text-orange-500 rounded-xl text-lg font-bold hover:scale-105 transition-transform shadow-lg"
              >
                Restart Activity
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Modal - All Slices Viewed */}
      <AnimatePresence>
        {showCompletionModal && (
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 10, stiffness: 100 }}
              className="bg-gradient-to-br from-green-400 to-blue-500 text-white rounded-3xl p-8 md:p-12 max-w-lg text-center shadow-2xl"
            >
              <motion.h2 
                className="text-4xl md:text-5xl font-bold mb-6"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                Activity Complete! 🎉
              </motion.h2>
              <p className="text-lg md:text-xl mb-8 opacity-90">
                Congratulations! You've viewed all slices.
              </p>
              <button 
                onClick={() => {
                  setShowCompletionModal(false);
                  handleRestart();
                }} 
                className="px-8 py-4 bg-white text-green-500 rounded-xl text-lg font-bold hover:scale-105 transition-transform shadow-lg"
              >
                Finish
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
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

      {/* Completion Modal - All Slices Viewed */}
      <AnimatePresence>
        {showCompletionModal && (
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
              className="bg-gradient-to-br from-green-400 to-blue-500 text-white rounded-3xl p-8 md:p-12 max-w-lg text-center shadow-2xl"
            >
              <motion.h2 
                className="text-4xl md:text-5xl font-bold mb-6"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Well Done! 🎉
              </motion.h2>
              <p className="text-lg md:text-xl mb-8 opacity-90" style={{ fontFamily: 'Roboto, sans-serif' }}>
                You've viewed all the slices. Great job!
              </p>
              <button 
                onClick={() => {
                  setShowCompletionModal(false);
                  // Reset or navigate away
                }} 
                className="px-8 py-4 bg-white text-green-500 rounded-xl text-lg font-bold hover:scale-105 transition-transform shadow-lg"
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                Finish
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

