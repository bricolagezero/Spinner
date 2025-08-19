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
  const [sliceCountdown, setSliceCountdown] = useState<number | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [viewedSlices, setViewedSlices] = useState<string[]>([]);
  // Track initial total slices to keep denominator fixed for the session
  const initialTotalRef = useRef<number>(settings.slices.length);
  // NEW: container ref for sizing when embedded
  const containerRef = useRef<HTMLDivElement>(null);

  // responsive size - bigger wheel, still safe on small screens
  const [size, setSize] = useState(500);
  useEffect(() => {
    const compute = () => {
      if (sleekMode && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Reserve space for the pointer above and side controls (Spin/Spins Left)
        const topOutset = 60;      // triangle pointer
        const bottomOutset = 16;   // small padding
        const sideOutset = 96;     // each side ~80-96px for controls
        const availW = Math.max(200, rect.width - sideOutset * 2);
        const availH = Math.max(200, rect.height - topOutset - bottomOutset);
        const s = Math.min(availW, availH);
        setSize(Math.max(420, Math.floor(s)));
      } else {
        // Slightly larger fallback for full-screen use
        setSize(Math.max(380, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.8)));
      }
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [sleekMode]);
  const radius = Math.floor(size * 0.45);
  const cx = size / 2, cy = size / 2;

  // Active slices are computed from session state, not persisted flags:
  // - allowRepeats: all slices eligible
  // - no repeats: exclude slices already viewed this session
  const activeSlices = useMemo(
    () =>
      settings.allowRepeats
        ? settings.slices
        : settings.slices.filter((s) => !viewedSlices.includes(s.id)),
    [settings.slices, settings.allowRepeats, viewedSlices]
  );
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

  // NEW: unify spin duration, whoosh promise handle, and sleep helper
  const SPIN_DURATION_MS = 3800;
  const whooshPromiseRef = useRef<Promise<void> | null>(null);
  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  // Make whoosh last the entire spin and return a promise when done
  const playWhoosh = (durationMs: number = SPIN_DURATION_MS) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return Promise.resolve();
    const o = ctx.createOscillator(), g = ctx.createGain();
    const dur = durationMs / 1000;
    o.type = "sawtooth";
    o.frequency.setValueAtTime(220, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + dur);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + Math.min(0.3, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
    return sleep(durationMs);
  };

  const pickIndex = () => {
    // Always avoid "grayed" slices by using session-based filter
    const candidates = activeSlices;
    if (candidates.length === 0) return -1;
    const id = candidates[Math.floor(Math.random() * candidates.length)].id;
    return settings.slices.findIndex((s) => s.id === id);
  };

  // In the spin function, ensure wheel stops with slice under triangle
  const spin = () => {
    if (spinning) return;
    // Do not spin if no eligible slices remain
    if (activeSlices.length === 0 || settings.slices.length === 0) return;
    onSpinStart?.();

    // Lock denominator on first spin (no slices viewed yet this session)
    const seenCountNow = new Set<string>(viewedSlices).size;
    if (seenCountNow === 0) {
      initialTotalRef.current = settings.slices.length;
    }

    const idx = pickIndex();
    if (idx < 0) return; // safety

    // Angle math
    const sliceAngle = 360 / settings.slices.length;
    const sliceStartAngle = idx * sliceAngle;
    const sliceCenterAngle = sliceStartAngle + (sliceAngle / 2);

    // Use current residual rotation so we always land exactly under the triangle
    const residual = rotationResidual; // [0..360)
    const deltaToCenter = (360 - ((sliceCenterAngle + residual) % 360)) % 360;
    const spins = 6 + Math.floor(Math.random() * 3);
    const finalRotation = spins * 360 + deltaToCenter;

    setSpinning(true);
    setResultIndex(idx);
    setCountdown(null);

    // Start whoosh and keep a handle to await later
    whooshPromiseRef.current = playWhoosh(SPIN_DURATION_MS);

    // Stretch tick sounds across the entire spin duration
    const interval = Math.max(70, Math.floor(SPIN_DURATION_MS / 24));
    const start = performance.now();
    const t = setInterval(() => {
      playTick();
      if (performance.now() - start >= SPIN_DURATION_MS - 20) clearInterval(t);
    }, interval);

    requestAnimationFrame(() => setRotation((r) => r + finalRotation));
  };

  const wheelRef = useRef<SVGGElement>(null);
  const wheelStyle: React.CSSProperties = {
    transform: "rotate(" + rotation + "deg)",
    transition: spinning ? `transform ${SPIN_DURATION_MS / 1000}s cubic-bezier(0.17,0.67,0.32,1.29)` : "none",
    transformOrigin: "center",
    transformBox: "fill-box",
    willChange: "transform",
  };

  // normalize residual rotation [0..360)
  const rotationResidual = ((rotation % 360) + 360) % 360;

  useEffect(() => {
    const el = wheelRef.current; if (!el) return;
    const onEnd = async (ev: TransitionEvent) => {
      // Only react to the wheel's transform transition ending (ignore bubbled transitions)
      if (!spinning) return;
      if (ev.propertyName !== "transform") return;
      if (ev.target !== el) return;

      setSpinning(false);

      // Inform external listeners when the wheel visually stops
      onSpinEnd?.();

      // Wait for whoosh to finish, then pause 1s, then perform actions
      try { await (whooshPromiseRef.current || Promise.resolve()); } catch {}
      await sleep(1000);

      setShowModal(true);
      if (settings.timerEnabled) {
        const totalSeconds = (settings.timerMinutes || 0) * 60 + (settings.timerSeconds || 0);
        setCountdown(totalSeconds);
      }
      if (resultIndex != null && settings.slices[resultIndex].timerSeconds) {
        setSliceCountdown(settings.slices[resultIndex].timerSeconds);
      }
      if (resultIndex != null) {
        const sliceId = settings.slices[resultIndex].id;
        if (!viewedSlices.includes(sliceId)) setViewedSlices(prev => [...prev, sliceId]);
      }

      // Remove persisted disabling. Session viewing controls eligibility.
      // if (!settings.allowRepeats && resultIndex != null) {
      //   const next = settings.slices.map((s, i) => (i === resultIndex ? { ...s, disabled: true } : s));
      //   setSettings({ ...settings, slices: next });
      // }

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

  const handleRestart = () => {
    // Session reset only; do not mutate slice objects
    setViewedSlices([]);
    // Reset denominator to current slices at restart
    initialTotalRef.current = settings.slices.length;
  };

  // geometry
  const slicePath = (index: number) => {
    const a0 = (index * sliceAngle * Math.PI) / 180;
    const a1 = ((index + 1) * sliceAngle * Math.PI) / 180;
    const x0 = cx + radius * Math.sin(a0), y0 = cy - radius * Math.cos(a0);
    const x1 = cx + radius * Math.sin(a1), y1 = cy - radius * Math.cos(a1);
    return `M${cx},${cy} L${x0},${y0} A${radius},${radius} 0 0,1 ${x1},${y1} Z`;
  };

  // Helper: wrap text into lines with a chars-per-line cap (no ellipsis)
  const wrapIntoLines = (text: string, charsPerLine: number) => {
    const words = text.trim().split(/\s+/);
    const out: string[] = [];
    let line = "";
    for (const w of words) {
      const cand = line ? `${line} ${w}` : w;
      if (cand.length > charsPerLine) {
        if (line) out.push(line);
        line = w;
      } else {
        line = cand;
      }
    }
    if (line) out.push(line);
    return out;
  };

  // Derived: spinsLeft = initial total - session-unique seen
  const uniqueSeenCount = Math.min(
    initialTotalRef.current,
    new Set<string>(viewedSlices).size
  );
  const spinsLeft = Math.max(0, initialTotalRef.current - uniqueSeenCount);

  return (
    <div
      ref={containerRef}
      className={`${sleekMode ? "h-full w-full" : "min-h-screen w-full"} p-4 flex flex-col relative`}
    >
      {/* Background image - scoped to this panel so it shows in Viewer too */}
      {settings.backgroundMode === 'image' && settings.backgroundUrl && (
        <div
          className="absolute inset-0 flex justify-center items-center pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <img src={settings.backgroundUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Main content wrapper - positioned above background */}
      <div className="flex-grow relative" style={{ zIndex: 1 }}>
        {/* Wheel container with subtle enter/spin animations */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: spinning ? 1.03 : 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 18 }}
          className={`relative mx-auto wheel-container ${spinning ? "" : "wheel-breathe"}`}
          style={{ width: size, height: size, filter: spinning ? "drop-shadow(0 0 30px rgba(99,102,241,0.35))" : "drop-shadow(0 10px 30px rgba(0,0,0,0.5))" }}
        >
          {/* Triangle indicator - face downward */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-16 z-40 triangle-indicator">
            <div
              className="
                w-0 h-0
                border-l-[40px] border-l-transparent
                border-r-[40px] border-r-transparent
                border-t-[80px] border-t-red-600
              "
              style={{ filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.6))" }}
            />
          </div>

          {/* Round Spin button - left side */}
          <button
            onClick={spin}
            // Disable if spinning or no active (eligible) slices left
            disabled={spinning || activeSlices.length === 0}
            className={`absolute -left-20 top-1/2 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 rounded-full grid place-items-center
              text-black font-extrabold text-sm md:text-base shadow-[0_0_35px_rgba(255,255,0,0.6)] border-4 border-yellow-200
              transition-all duration-300 ${spinning ? "bg-gray-300 cursor-not-allowed" : "bg-yellow-400 hover:bg-yellow-300 hover:scale-105"}`}
            aria-label="Spin"
            title="Spin"
          >
            <div className="text-2xl md:text-3xl">⟳</div>
            <div>SPIN</div>
          </button>

          {/* Spins Left counter - right side (fixed denominator, session-unique seen) */}
          <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-20 md:w-24 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md text-white text-center py-2 shadow-lg">
            <div className="text-[10px] md:text-xs opacity-80">Spins Left</div>
            <div className="text-lg md:text-xl font-bold">
              {spinsLeft}/{initialTotalRef.current}
            </div>
          </div>

          {/* SVG Wheel */}
          <svg width={size} height={size} className="drop-shadow-2xl" style={{ overflow: "visible" }}>
            {/* slice shadow filter via CSS class or fallback to plain */}
            <g ref={wheelRef} style={wheelStyle}>
              {settings.slices.map((slice, i) => {
                const isViewed = viewedSlices.includes(slice.id);
                // Dynamic numbers; labels now uniform size across slices
                const numberFont = Math.max(26, Math.round(size / 14));
                const textRing = radius * 0.5;
                const arc = 2 * Math.PI * textRing * (sliceAngle / 360) * 0.9; // padding on arc

                // Uniform label font (no per-slice shrinking)
                const labelFont = Math.max(14, Math.round(size / 22));
                const approxCharWidth = labelFont * 0.6;
                const charsPerLine = Math.max(6, Math.floor(arc / approxCharWidth));
                // Allow up to 3 lines
                const maxLines = 3;
                const lines = wrapIntoLines(slice.label, charsPerLine).slice(0, maxLines);
                const labelLineHeight = Math.round(labelFont * 1.12);

                // NEW: circle at the top edge of the slice (for number or icon)
                const baseDiameter = Math.min(100, Math.max(60, Math.round(size * 0.18)));
                const circleDiameter = Math.max(40, baseDiameter - 20); // 20px smaller
                const circleRadius = circleDiameter / 2;
                // Place the circle so its center sits exactly on the outer edge (half in, half out)
                const circleCY = -radius;
                // Labels start ~50px below the circle's bottom edge (inside the wheel)
                const labelStartY = circleCY + circleRadius + 50;

                const clipId = `sliceIconClip-${slice.id}`;

                return (
                  <g key={slice.id}>
                    <path
                      d={slicePath(i)}
                      // Light gray instead of transparency when viewed
                      fill={isViewed ? "#e5e7eb" : slice.color}
                      stroke="#333"
                      strokeWidth="2"
                      opacity={1}
                      className="slice-shadow"
                      style={{ transition: "filter 0.3s ease, opacity 0.3s ease" }}
                    />
                    <g transform={`translate(${cx},${cy}) rotate(${i * sliceAngle + sliceAngle / 2})`}>
                      {/* Circle for number/icon at the top edge */}
                      <defs>
                        <clipPath id={clipId}>
                          <circle cx="0" cy={circleCY} r={circleRadius} />
                        </clipPath>
                      </defs>
                      <circle
                        cx={0}
                        cy={circleCY}
                        r={circleRadius}
                        fill="#fff"
                        stroke="#333"
                        strokeWidth={3}
                      />
                      {/* Icon inside circle if present, else the number */}
                      {slice.iconUrl ? (
                        <image
                          href={slice.iconUrl}
                          x={-circleRadius}
                          y={circleCY - circleRadius}
                          width={circleDiameter}
                          height={circleDiameter}
                          preserveAspectRatio="xMidYMid slice"
                          clipPath={`url(#${clipId})`}
                        />
                      ) : (
                        <text
                          x={0}
                          y={circleCY + Math.round(numberFont * 0.35)}
                          textAnchor="middle"
                          fill="#111827"
                          fontSize={numberFont}
                          fontWeight="800"
                          className="wheel-slice-text"
                        >
                          {i + 1}
                        </text>
                      )}

                      {/* Label - up to 3 lines, start ~50px below the circle */}
                      {lines.map((line, lineIndex) => (
                        <text
                          key={lineIndex}
                          x="0"
                          y={labelStartY + lineIndex * labelLineHeight}
                          textAnchor="middle"
                          fill="white"
                          fontSize={labelFont}
                          fontWeight="600"
                          className="wheel-slice-text"
                        >
                          {line}
                        </text>
                      ))}
                    </g>
                  </g>
                );
              })}
            </g>
            {/* Center cap */}
            <circle cx={cx} cy={cy} r={size * 0.06} fill="white" stroke="#333" strokeWidth="3" />
          </svg>
        </motion.div>
      </div>

      {/* Slice modal - 90% viewport, content 90% inside, no scrollbars */}
      <AnimatePresence>
        {showModal && current && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="relative w-[90vw] max-w-[1200px]"
              style={{ height: "min(90vh, calc(100dvh - 32px))" }}
            >
              {/* Subtle animated border using SVG dashed gradient (no spinning rectangle) */}
              <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sliceModalBorderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="25%" stopColor="#ef4444" />
                    <stop offset="50%" stopColor="#10b981" />
                    <stop offset="75%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
                <rect
                  x="2.5" y="2.5" width="95" height="95" rx="12" ry="12"
                  fill="none"
                  stroke="url(#sliceModalBorderGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="28 16"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-180" dur="8s" repeatCount="indefinite" />
                </rect>
                <rect
                  x="2.5" y="2.5" width="95" height="95" rx="12" ry="12"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.15"
                  strokeWidth="1"
                />
              </svg>

              {/* Content panel inset by 5px to reveal the border */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="absolute inset-[5px] bg-white/80 backdrop-blur-md rounded-2xl p-4 md:p-6 overflow-hidden shadow-2xl"
              >
                {/* Use full height, header + scrollable content (with sticky action area) */}
                <div className="h-full w-full mx-auto flex flex-col gap-3 overflow-hidden">
                  {/* Header: timers + title pill */}
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    {settings.timerEnabled && countdown != null && (
                      <div className="text-base md:text-lg font-semibold text-center text-black">
                        Global Timer: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                      </div>
                    )}
                    {current.timerSeconds && sliceCountdown != null && sliceCountdown > 0 && (
                      <div className="text-base md:text-lg font-semibold text-center text-purple-600">
                        Slice Timer: {Math.floor(sliceCountdown / 60)}:{String(sliceCountdown % 60).padStart(2, '0')}
                      </div>
                    )}
                    <motion.div
                      initial={{ y: -24, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 1 }}
                      className="px-4 py-2 rounded-full bg-slate-900/85 text-white shadow-lg"
                    >
                      <h2 className="m-0 text-2xl md:text-3xl font-bold text-center">
                        {current.label}
                      </h2>
                    </motion.div>
                  </div>

                  {/* Middle: scrollable content + sticky action area close to content */}
                  <div className="flex-1 overflow-auto w-full flex flex-col items-center justify-start gap-3">
                    {current.outcomeImageUrl && (
                      <div className="w-full flex items-center justify-center">
                        <img
                          src={current.outcomeImageUrl}
                          className="rounded-lg shadow-lg max-w-full max-h-full object-contain animate-float-slow"
                          style={{ transform: `scale(${current.outcomeImageScale ?? 1})` }}
                          alt=""
                        />
                      </div>
                    )}
                    {current.outcomeText && (
                      <div className="w-full flex items-center justify-center">
                        <p className="text-center text-black w-full" style={{ fontSize: current.outcomeFontSize ?? 16 }}>
                          {current.outcomeText}
                        </p>
                      </div>
                    )}

                    {/* Sticky action area: stays near content and visible; larger buttons */}
                    <div className="sticky bottom-0 w-full pt-2 pb-1 bg-white/60 backdrop-blur-md rounded-b-xl">
                      <div className="flex items-center justify-center">
                        {spinsLeft === 0 ? (
                          <button
                            onClick={() => {
                              setShowModal(false);
                              setShowCompletionModal(true);
                            }}
                            className="px-8 py-4 text-lg md:text-xl bg-blue-500 text-white rounded-2xl hover:bg-blue-600 font-semibold shadow-xl"
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
                            className="px-8 py-4 text-lg md:text-xl bg-blue-500 text-white rounded-2xl hover:bg-blue-600 font-semibold shadow-xl"
                          >
                            Spin Again
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Modal - All Slices Viewed (triggered after closing last modal) */}
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

