import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";

// ========================================
// Types
// ========================================
type Slice = {
  id: string;
  label: string;
  color: string;
  outcomeText?: string;
  outcomeImageUrl?: string; // uploaded file URL
  iconUrl?: string; // optional small icon for the slice (upload-only)
  disabled?: boolean; // used when allowRepeats = false
  outcomeFontSize?: number;   // px
  outcomeImageScale?: number; // 0.2 - 1.2
};

type GameSettings = {
  title: string;
  subtitle?: string;
  footer?: string;
  // background
  backgroundMode?: "image" | "gradient";
  backgroundUrl?: string;
  bgGradient?: { from: string; to: string; angle: number };

  allowRepeats: boolean;
  timerEnabled: boolean;
  timerSeconds: number;
  slices: Slice[];
};


type Mode = "editor" | "viewer";

type SpinGameProps = {
  mode?: Mode;
  apiBaseUrl?: string;
  gameSlug?: string;
};

// ========================================
// Utilities
// ========================================
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const DEFAULT_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0ea5e9",
  "#f43f5e",
  "#10b981",
];

const makeDefaultSlices = (n: number): Slice[] =>
  Array.from({ length: n }, (_, i) => ({
    id: uid(),
    label: `Item ${i + 1}`,
    color: DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
  }));

// ========================================
// Root Component
// ========================================
export default function SpinGame({ mode = "editor", apiBaseUrl = "", gameSlug }: SpinGameProps) {
  const [settings, setSettings] = useState<GameSettings>({
  title: "Spin Challenge",
  subtitle: "Put reps on the spot",
  footer: "",
  backgroundMode: "image",
  backgroundUrl: "",
  bgGradient: { from: "#020617", to: "#1e293b", angle: 45 },
  allowRepeats: true,
  timerEnabled: false,
  timerSeconds: 10,
  slices: makeDefaultSlices(8),
}
);

  const [activeStep, setActiveStep] = useState<number>(0);
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);

  // Load game in viewer mode
  useEffect(() => {
    if (mode === "viewer" && apiBaseUrl && gameSlug) {
      fetch(`${apiBaseUrl}/games/${gameSlug}`)
        .then((r) => r.json())
        .then((data) => data?.settings && setSettings(data.settings))
        .catch(() => {});
    }
  }, [mode, apiBaseUrl, gameSlug]);

  // Lightweight runtime checks (acts like very simple tests)
  useEffect(() => {
    try {
      console.assert(settings.slices.length > 0, "No slices defined");
      settings.slices.forEach((s) => console.assert(!!s.label, "Slice missing label"));
    } catch {}
  }, [settings]);

  const steps = [
    {
      label: "Basics",
      content: (
        <Basics
          settings={settings}
          setSettings={setSettings}
          apiBaseUrl={apiBaseUrl}
          adminPassword={adminPassword}
          setAdminPassword={setAdminPassword}
        />
      ),
    },
    {
      label: "Slices",
      content: (
        <Slices
          settings={settings}
          setSettings={setSettings}
          apiBaseUrl={apiBaseUrl}
          adminPassword={adminPassword}
        />
      ),
    },
    { label: "Preview", content: <PreviewPanel settings={settings} /> },
    {
      label: "Admin",
      content: (
        <AdminPanel
          apiBaseUrl={apiBaseUrl}
          adminPassword={adminPassword}
          setAdminPassword={setAdminPassword}
          onLoadGame={(slug, data) => {
            setCurrentSlug(slug);
            setSettings(data.settings);
            setActiveStep(0);
          }}
        />
      ),
    },
  ];

  // Full-screen viewer – no tabs, just the wheel
  if (mode === "viewer") {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
    style={
  settings.backgroundMode === "gradient"
    ? { backgroundImage: `linear-gradient(${settings.bgGradient?.angle ?? 45}deg, ${settings.bgGradient?.from ?? "#020617"}, ${settings.bgGradient?.to ?? "#1e293b"})`,
        backgroundSize: "cover", backgroundPosition: "center" }
    : (settings.backgroundUrl
        ? { backgroundImage: `url(${settings.backgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
        : {})
}

      >
        <WheelPanel settings={settings} setSettings={setSettings} sleekMode={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-6 gap-6 bg-gradient-to-br from-slate-800 to-indigo-900 text-white">
      <Header settings={settings} />

      <div className="w-full max-w-5xl bg-black/40 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-around mb-6">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={`px-4 py-2 rounded-xl ${activeStep === i ? "bg-pink-600 text-white shadow-lg" : "bg-white/20"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="transition-all min-h-[420px]">{steps[activeStep].content}</div>
      </div>
    </div>
  );
}

// ========================================
// Header
// ========================================
function Header({ settings }: { settings: GameSettings }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <h1 className="text-4xl font-bold drop-shadow-lg bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent">
        {settings.title}
      </h1>
      {settings.subtitle && <p className="text-lg opacity-90">{settings.subtitle}</p>}
    </div>
  );
}

// ========================================
// Basics (admin + global config)
// ========================================
function Basics({
  settings,
  setSettings,
  apiBaseUrl,
  adminPassword,
  setAdminPassword,
}: {
  settings: GameSettings;
  setSettings: (u: any) => void;
  apiBaseUrl?: string;
  adminPassword: string;
  setAdminPassword: (s: string) => void;
}) {
  const [bgPct, setBgPct] = useState(0);
  const bgMode = settings.backgroundMode ?? "image";
  const gradient = settings.bgGradient ?? { from: "#020617", to: "#1e293b", angle: 45 };

  // robust upload with progress (XHR)
  const uploadBg = async (file: File) => {
    if (!apiBaseUrl) return alert("No API base URL configured.");
    setBgPct(0);
    const fd = new FormData();
    fd.append("file", file);
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${apiBaseUrl}/upload`, true);
      xhr.setRequestHeader("x-admin-pass", adminPassword || "");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setBgPct(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300 && json?.url) {
            setSettings({ ...settings, backgroundUrl: json.url, backgroundMode: "image" });
            resolve();
          } else {
            reject(new Error(json?.error || `Upload failed (${xhr.status})`));
          }
        } catch (err: any) {
          reject(new Error(err?.message || "Bad JSON"));
        }
      };
      xhr.send(fd);
    }).catch((e: any) => alert(e?.message || e));
  };

  return (
    <div className="space-y-4 bg-white rounded-2xl p-4 text-slate-900 shadow-xl">
      <label className="block">
        <span className="text-sm">Admin Password</span>
        <input
          type="password"
          className="w-full mt-1 px-3 py-2 rounded-xl bg-white border text-slate-900"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm">Title</span>
          <input
            className="w-full mt-1 px-3 py-2 rounded-xl bg-white border"
            value={settings.title}
            onChange={(e) => setSettings({ ...settings, title: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm">Subtitle</span>
          <input
            className="w-full mt-1 px-3 py-2 rounded-xl bg-white border"
            value={settings.subtitle || ""}
            onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm">Footer</span>
          <input
            className="w-full mt-1 px-3 py-2 rounded-xl bg-white border"
            value={settings.footer || ""}
            onChange={(e) => setSettings({ ...settings, footer: e.target.value })}
          />
        </label>
      </div>

      {/* Background selector */}
      <div className="rounded-2xl bg-white p-4 shadow space-y-3">
        <div className="flex items-center gap-3">
          <div className="font-semibold">Background</div>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={bgMode === "image"}
              onChange={() => setSettings({ ...settings, backgroundMode: "image" })}
            />
            <span>Image</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={bgMode === "gradient"}
              onChange={() => setSettings({ ...settings, backgroundMode: "gradient" })}
            />
            <span>Gradient</span>
          </label>
        </div>

        {bgMode === "image" ? (
          <div>
            <input type="file" accept="image/*" onChange={(e) => e.target.files && uploadBg(e.target.files[0])} />
            {bgPct > 0 && bgPct < 100 && (
              <div className="mt-2 h-2 w-full bg-slate-200 rounded">
                <div className="h-2 bg-green-500 rounded" style={{ width: `${bgPct}%` }} />
              </div>
            )}
            {settings.backgroundUrl && (
              <div className="mt-2 text-xs text-green-700 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={settings.backgroundUrl} className="h-12 rounded" alt="bg" />
                <span>Background set ✓</span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm">From</span>
              <input
                type="color"
                className="w-full h-10 rounded border"
                value={gradient.from}
                onChange={(e) => setSettings({ ...settings, bgGradient: { ...gradient, from: e.target.value } })}
              />
            </label>
            <label className="block">
              <span className="text-sm">To</span>
              <input
                type="color"
                className="w-full h-10 rounded border"
                value={gradient.to}
                onChange={(e) => setSettings({ ...settings, bgGradient: { ...gradient, to: e.target.value } })}
              />
            </label>
            <label className="block">
              <span className="text-sm">Angle</span>
              <input
                type="number"
                className="w-full mt-1 px-3 py-2 rounded-xl bg-white border"
                value={gradient.angle}
                onChange={(e) =>
                  setSettings({ ...settings, bgGradient: { ...gradient, angle: Number(e.target.value || 0) } })
                }
              />
            </label>
          </div>
        )}
      </div>

      {/* repeats/timer */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!settings.allowRepeats}
            onChange={(e) =>
              setSettings({ ...settings, allowRepeats: !e.target.checked })
            }
          />
          <span>No repeats</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.timerEnabled}
            onChange={(e) =>
              setSettings({ ...settings, timerEnabled: e.target.checked })
            }
          />
          <span>Countdown</span>
        </label>
        <label className="flex items-center gap-2">
          <span>Seconds</span>
          <input
            type="number"
            min={3}
            max={300}
            className="w-24 px-3 py-2 rounded-xl bg-white border"
            value={settings.timerSeconds}
            onChange={(e) =>
              setSettings({
                ...settings,
                timerSeconds: clamp(parseInt(e.target.value || "0"), 3, 300),
              })
            }
          />
        </label>
      </div>
    </div>
  );
}

// ========================================
// Slices
// ========================================
function Slices({
  settings,
  setSettings,
  apiBaseUrl,
  adminPassword,
}: {
  settings: GameSettings;
  setSettings: (u: any) => void;
  apiBaseUrl?: string;
  adminPassword: string;
}) {
  return (
   <div className="space-y-3">
  {settings.slices.map((s, i) => (
        <SliceEditor
          key={s.id}
          slice={s}
          index={i}
          onChange={(patch) => {
            const next = [...settings.slices];
            next[i] = { ...s, ...patch };
            setSettings({ ...settings, slices: next });
          }}
          onRemove={() =>
            setSettings({
              ...settings,
              slices: settings.slices.filter((x) => x.id !== s.id),
            })
          }
          apiBaseUrl={apiBaseUrl}
          adminPassword={adminPassword}
        />
      ))}
    </div>
  );
}

function SliceEditor({
  slice,
  onChange,
  onRemove,
  index,
  apiBaseUrl,
  adminPassword,
}: {
  slice: Slice;
  onChange: (p: Partial<Slice>) => void;
  onRemove: () => void;
  index: number;
  apiBaseUrl?: string;
  adminPassword: string;
}) {
  const [uploadingOutcome, setUploadingOutcome] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const uploadTo = async (
    file: File,
    kind: "outcome" | "icon"
  ): Promise<string | null> => {
    if (!apiBaseUrl) {
      alert("No API base URL configured.");
      return null;
    }
    const fd = new FormData();
    fd.append("file", file);
    kind === "outcome" ? setUploadingOutcome(true) : setUploadingIcon(true);
    const res = await fetch(`${apiBaseUrl}/upload`, {
      method: "POST",
      headers: { "x-admin-pass": adminPassword || "" },
      body: fd,
    });
    const json = await res.json();
    kind === "outcome" ? setUploadingOutcome(false) : setUploadingIcon(false);
    if (res.ok && json?.url) return json.url;
    alert(json?.error || "Upload failed");
    return null;
  };

  return (
    <div className="rounded-xl p-4 bg-white flex flex-col gap-3 text-slate-900 shadow">
      <div className="font-semibold">Slice {index + 1}</div>
      <input
        className="px-2 py-2 rounded border"
        value={slice.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Label"
      />
      <div className="flex items-center gap-2">
        <span className="text-sm">Color</span>
        <input
          type="color"
          value={slice.color}
          onChange={(e) => onChange({ color: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm">Icon (upload, optional)</span>
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const url = await uploadTo(f, "icon");
            if (url) onChange({ iconUrl: url });
          }}
        />
        {uploadingIcon && <span className="text-xs">Uploading…</span>}
        {slice.iconUrl && (
          <a
            className="text-xs underline"
            href={slice.iconUrl}
            target="_blank"
            rel="noreferrer"
          >
            View
          </a>
        )}
      </div>
      <textarea
        className="px-2 py-2 rounded border"
        rows={2}
        value={slice.outcomeText || ""}
        onChange={(e) => onChange({ outcomeText: e.target.value })}
        placeholder="Outcome text"
      />
      <div>
        <span className="text-sm">Outcome Image (upload)</span>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const url = await uploadTo(f, "outcome");
              if (url) onChange({ outcomeImageUrl: url });
            }}
          />
          {uploadingOutcome && <span className="text-xs">Uploading…</span>}
          {slice.outcomeImageUrl && (
            <a
              className="text-xs underline"
              href={slice.outcomeImageUrl}
              target="_blank"
              rel="noreferrer"
            >
              View
            </a>
          )}
        </div>
      </div>
      <button onClick={onRemove} className="mt-2 px-3 py-2 rounded bg-red-600 text-white">
        Delete
      </button>
    </div>
  );
}

// ========================================
// Preview
// ========================================
function PreviewPanel({ settings }: { settings: GameSettings }) {
  const [local, setLocal] = useState<GameSettings>(() =>
    JSON.parse(JSON.stringify(settings)) as GameSettings
  );
  useEffect(() => setLocal(JSON.parse(JSON.stringify(settings))), [settings]);
  return <WheelPanel settings={local} setSettings={setLocal as any} sleekMode={true} />;
}

// ========================================
// Wheel (game view)
// ========================================
function WheelPanel({
  settings,
  setSettings,
  sleekMode,
}: {
  settings: GameSettings;
  setSettings: (u: any) => void;
  sleekMode: boolean;
}) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const activeSlices = useMemo(
    () => settings.slices.filter((s) => !s.disabled),
    [settings.slices]
  );
  const sliceAngle = 360 / settings.slices.length;

  const pickIndex = () => {
    const candidates = settings.allowRepeats ? settings.slices : activeSlices;
    if (candidates.length === 0) return 0;
    const pickedId = candidates[Math.floor(Math.random() * candidates.length)].id;
    return settings.slices.findIndex((s) => s.id === pickedId);
  };

  const spin = () => {
    if (spinning) return;
    if ((!settings.allowRepeats && activeSlices.length === 0) || settings.slices.length === 0) return;
    const idx = pickIndex();
    if (idx < 0) return;

    const targetSliceCenter = idx * sliceAngle + sliceAngle / 2; // deg from 0
    const spins = 6 + Math.floor(Math.random() * 3); // 6-8 full turns
    const finalRotation = spins * 360 + (360 - targetSliceCenter);

    setSpinning(true);
    setResultIndex(idx);
    requestAnimationFrame(() => setRotation((r) => r + finalRotation));
  };

  const wheelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const onEnd = () => {
      if (!spinning) return;
      setSpinning(false);
      setShowModal(true);
      if (settings.timerEnabled) setCountdown(settings.timerSeconds);
      if (!settings.allowRepeats && resultIndex != null) {
        const next = settings.slices.map((s, i) => (i === resultIndex ? { ...s, disabled: true } : s));
        setSettings({ ...settings, slices: next });
      }
    };
    el.addEventListener("transitionend", onEnd);
    return () => el.removeEventListener("transitionend", onEnd);
  }, [spinning, resultIndex, settings.allowRepeats, settings.timerEnabled, settings.timerSeconds, settings.slices, setSettings]);

  useEffect(() => {
    if (countdown == null) return;
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => (c == null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const current = resultIndex != null ? settings.slices[resultIndex] : null;

  // Build a path for each slice
  const slicePath = (index: number) => {
    const a0 = (index * sliceAngle * Math.PI) / 180;
    const a1 = ((index + 1) * sliceAngle * Math.PI) / 180;
    const r = 180; // radius
    const x0 = 200 + r * Math.sin(a0);
    const y0 = 200 - r * Math.cos(a0);
    const x1 = 200 + r * Math.sin(a1);
    const y1 = 200 - r * Math.cos(a1);
    return `M200,200 L${x0},${y0} A${r},${r} 0 0,1 ${x1},${y1} Z`;
  };

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Pointer */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-20 w-0 h-0 border-l-8 border-r-8 border-b-[18px] border-l-transparent border-r-transparent border-b-white drop-shadow" />

      {/* Wheel */}
      <div
        ref={wheelRef}
        style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 3.6s ease-out" : "none" }}
        className={`relative w-[420px] h-[420px] rounded-full overflow-hidden shadow-2xl select-none ${
          sleekMode ? "bg-[conic-gradient(at_50%_50%,#111_0deg,#0ea5e9_90deg,#7c3aed_180deg,#f59e0b_270deg,#111_360deg)]" : "bg-white"
        }`}
      >
        <svg viewBox="0 0 400 400" className="w-full h-full">
          {settings.slices.map((s, i) => (
            <motion.path
              key={s.id}
              d={slicePath(i)}
              fill={s.disabled ? desaturate(s.color) : s.color}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, type: "spring", stiffness: 140, damping: 18 }}
            />
          ))}

          {/* Labels */}
          {settings.slices.map((s, i) => {
            const angle = i * sliceAngle + sliceAngle / 2;
            const rad = (angle * Math.PI) / 180;
            const rx = 200 + 130 * Math.sin(rad);
            const ry = 200 - 130 * Math.cos(rad);
            return (
              <g key={`${s.id}-label`}>
                <text x={rx} y={ry} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#fff">
                  {s.label}
                </text>
              </g>
            );
          })}

          <circle cx="200" cy="200" r="24" fill="#111" />
        </svg>
        {sleekMode && (
          <div className="absolute inset-0 rounded-full shadow-[0_0_60px_10px_rgba(255,255,255,0.08)] pointer-events-none" />
        )}
      </div>

      <button
        onClick={spin}
        disabled={spinning || (!settings.allowRepeats && activeSlices.length === 0)}
        className={`px-6 py-3 rounded-xl text-black font-bold text-lg shadow-lg ${spinning ? "bg-gray-400" : "bg-yellow-400 hover:bg-yellow-300"}`}
      >
        {spinning ? "Spinning…" : "Spin"}
      </button>

      {/* Outcome Modal */}
      {showModal && current && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white text-black rounded-2xl p-8 max-w-xl w-full flex flex-col items-center relative"
          >
            <h2 className="text-3xl font-bold mb-4">{current.label}</h2>
            {current.outcomeImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.outcomeImageUrl} className="max-h-[40vh] mb-4 rounded-xl" alt="Outcome" />
            )}
            {current.outcomeText && <p className="mb-4 text-lg text-center">{current.outcomeText}</p>}

            {settings.timerEnabled && countdown != null && (
              <div className="relative mt-2">
                <div className="relative w-24 h-24 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-3xl font-bold text-pink-600 shadow-[0_0_30px_rgba(255,255,255,0.2)] animate-pulse">
                  {countdown}
                  <svg className="absolute inset-0" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="6" />
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
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

// ========================================
// Admin (Library)
// ========================================
function AdminPanel({
  apiBaseUrl,
  adminPassword,
  setAdminPassword,
  onLoadGame,
}: {
  apiBaseUrl?: string;
  adminPassword: string;
  setAdminPassword: (s: string) => void;
  onLoadGame: (slug: string, data: any) => void;
}) {
  const [games, setGames] = useState<{ slug: string; updated_at?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrSlug, setQrSlug] = useState<string | null>(null);

  const refresh = async () => {
    if (!apiBaseUrl) return alert("No API base URL configured.");
    setLoading(true);
    const res = await fetch(`${apiBaseUrl}/games`, {
      headers: { "x-admin-pass": adminPassword || "" },
    });
    const json = await res.json();
    setLoading(false);
    if (res.ok) setGames(json.games || []);
    else alert(json?.error || "List failed");
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 bg-white rounded-2xl p-4 text-slate-900 shadow-xl">
      <label className="block">
        <span className="text-sm">Admin Password</span>
        <input
          type="password"
          className="w-full mt-1 px-3 py-2 rounded-xl bg-white border text-slate-900"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
        />
      </label>
      <button onClick={refresh} className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl">
        {loading ? "Loading…" : "Refresh"}
      </button>

      <div className="grid gap-4">
        {games.map((g) => (
          <div key={g.slug} className="bg-slate-100 rounded-xl p-4 flex justify-between items-center">
            <div>
              <div className="font-mono text-lg">{g.slug}</div>
              <div className="text-xs text-slate-600">Updated {g.updated_at || ""}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  const res = await fetch(`${apiBaseUrl}/games/${g.slug}`);
                  const data = await res.json();
                  if (res.ok) onLoadGame(g.slug, data);
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 text-white"
              >
                Edit
              </button>
              <a
                href={`/game/${g.slug}`}
                target="_blank"
                className="px-3 py-2 rounded-xl bg-indigo-600 text-white"
                rel="noreferrer"
              >
                Open URL
              </a>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`${location.origin}/game/${g.slug}`);
                }}
                className="px-3 py-2 rounded-xl bg-indigo-100 text-slate-900"
              >
                Copy URL
              </button>
              <button onClick={() => setQrSlug(g.slug)} className="px-3 py-2 rounded-xl bg-pink-600 text-white">
                QR
              </button>
              <button
                onClick={async () => {
                  const res = await fetch(`${apiBaseUrl}/games/${g.slug}/duplicate`, {
                    method: "POST",
                    headers: { "x-admin-pass": adminPassword || "" },
                  });
                  const json = await res.json();
                  if (res.ok) refresh();
                  else alert(json?.error || "Duplicate failed");
                }}
                className="px-3 py-2 rounded-xl bg-amber-500 text-black"
              >
                Duplicate
              </button>
            </div>
          </div>
        ))}
        {games.length === 0 && <div className="text-sm text-slate-500">No spinners yet.</div>}
      </div>

      {qrSlug && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setQrSlug(null)}
        >
          <div className="bg-white rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-2">Scan to open</div>
            <QRCodeCanvas value={`${location.origin}/game/${qrSlug}`} size={260} includeMargin />
            <div className="mt-3 text-center text-xs">/game/{qrSlug}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// Color helper (for disabled slices)
// ========================================
function desaturate(hex: string) {
  try {
    const [r, g, b] = hexToRgb(hex);
    const m = (r + g + b) / 3;
    const mix = (x: number) => Math.round((x + 2 * m) / 3);
    const rr = mix(r), gg = mix(g), bb = mix(b);
    return rgbToHex(rr, gg, bb);
  } catch {
    return "#9ca3af";
  }
}
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}
function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
