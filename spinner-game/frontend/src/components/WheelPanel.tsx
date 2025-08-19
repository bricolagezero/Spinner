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
  }, [spinning, resultIndex, settings, setSettings]);

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
        <div className="relative w-80 h-80 mx-auto">
          {/* Triangle indicator - higher z-index */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-40">
            <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[40px] border-b-red-600"></div>
          </div>

          {/* Wheel */}
          <div
            className="relative w-full h-full rounded-full overflow-hidden shadow-2xl transition-transform duration-[3000ms] ease-out"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {settings.slices.map((slice, index) => {
              const angle = 360 / settings.slices.length;
              const skew = 90 - angle;
              const rotation = index * angle;
              const isViewed = viewedSlices.includes(slice.id);

              return (
                <div
                  key={slice.id}
                  className="absolute w-1/2 h-1/2 origin-bottom-right"
                  style={{
                    transform: `rotate(${rotation}deg) skewY(-${skew}deg)",
                    top: '0',
                    left: '0',
                  }}
                >
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundColor: slice.color,
                      opacity: isViewed ? 0.5 : 1,
                      filter: isViewed ? 'grayscale(70%)' : 'none',
                      transformOrigin: 'right bottom',
                      transform: `skewY(${skew}deg)`,
                    }}
                  />
                  
                  {/* Slice content */}
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      transform: `skewY(${skew}deg) rotate(${angle / 2}deg)`,
                    }}
                  >
                    <div 
                      className="text-center flex flex-col items-center justify-center"
                      style={{
                        transform: `rotate(-${rotation + angle / 2}deg)",
                      }}
                    >
                      {/* Number always on top and bigger */}
                      <div className="text-3xl font-bold text-white mb-1 drop-shadow-lg">
                        {index + 1}
                      </div>
                      {/* Text below number */}
                      <div className="text-sm text-white px-2 font-medium drop-shadow">
                        {slice.label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center cap */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl z-30"></div>
        </div>

        {/* Spin button */}
        <div className="text-center mt-8">
          <button
            onClick={spin}
            disabled={spinning || viewedSlices.length === settings.slices.length}
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
      {showModal && current && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">{current.label}</h2>
            
            {current.timerSeconds && current.timerSeconds > 0 && (
              <div className="mb-4 text-lg">
                Time remaining: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
              </div>
            )}

            {/* Button based on whether all slices are viewed */}
            {viewedSlices.length === settings.slices.length ? (
              <button
                onClick={() => {
                  setShowModal(false);
                  setShowCompletionModal(true);
                }}
                className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
              >
                Close
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowModal(false);
                  spin();
                }}
                className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
              >
                Spin Again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Completion modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-3xl font-bold mb-4 text-center text-green-600">Activity Complete!</h2>
            <p className="text-lg text-center mb-6">Congratulations! You've viewed all slices.</p>
            <button
              onClick={() => {
                setShowCompletionModal(false);
                // Reset or navigate
              }}
              className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 w-full font-semibold"
            >
              Finish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
              </div>
              
              {/* Content */}
              <div className="relative bg-white text-black rounded-2xl p-6 md:p-8 w-[90vw] h-[90vh] max-w-[90vw] max-h-[90vh] flex flex-col items-center overflow-auto shadow-2xl">
                {/* Global Timer */}
                {settings.timerEnabled && countdown != null && (
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-black/80 backdrop-blur-md rounded-2xl px-6 py-3 text-white font-bold text-2xl shadow-[0_0_30px_rgba(255,255,255,0.3)] animate-pulse" style={{ fontFamily: 'Roboto, sans-serif' }}>
                      {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                    </div>
                  </div>
                )}
                
                {/* Per-slice Timer */}
                {current.timerSeconds && sliceCountdown != null && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-full w-20 h-20 flex items-center justify-center text-white font-bold text-2xl shadow-[0_0_20px_rgba(236,72,153,0.5)] animate-pulse">
                      {sliceCountdown}
                    </div>
                  </div>
                )}
                
                <h2 className="text-3xl font-bold mb-4 text-center" style={{ fontFamily: 'Roboto, sans-serif' }}>{current.label}</h2>
                {current.outcomeImageUrl && (
                  <div className="w-full flex justify-center mb-4 px-4">
                    <div className="max-w-full" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                      <img 
                        src={current.outcomeImageUrl}
                        className="rounded-xl shadow-lg cursor-pointer hover:scale-105 transition-transform object-contain"
                        style={{ 
                          maxWidth: '100%',
                          maxHeight: '45vh',
                          width: 'auto',
                          height: 'auto',
                          transform: `scale(${current.outcomeImageScale ?? 0.6})`
                        }}
                        alt=""
                        onClick={() => window.open(current.outcomeImageUrl, '_blank')}
                      />
                    </div>
                  </div>
                )}
                {current.outcomeText && (
                  <p className="mb-4 text-center" style={{ fontSize: current.outcomeFontSize ?? 20, fontFamily: 'Roboto, sans-serif' }}>
                    {current.outcomeText}
                  </p>
                )}
                <button 
                  onClick={() => {
                    setShowModal(false);
                    setSliceCountdown(null);
                  }} 
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

