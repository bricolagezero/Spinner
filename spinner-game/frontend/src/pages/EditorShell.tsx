import React, { useEffect, useState } from "react";
import { GameSettings } from "../types";
import SliceEditor from "../components/SliceEditor";
import PreviewModal from "../components/PreviewModal";
import { QRCodeCanvas } from "qrcode.react";
import { apiUrl, safeJson, API_BASE } from "../utils/api";

const uid = () => Math.random().toString(36).slice(2, 9);
const DEFAULT_PALETTE = ["#2563eb","#16a34a","#f59e0b","#dc2626"];

export function Basics({
  settings, setSettings, adminPassword, setAdminPassword
}: { settings: GameSettings; setSettings: (u: any) => void; adminPassword: string; setAdminPassword: (s: string) => void; }) {
  const [bgPct, setBgPct] = useState(0);
  const bgMode = settings.backgroundMode ?? "image";
  const gradient = settings.bgGradient ?? { from: "#020617", to: "#1e293b", angle: 45 };

  const onUpload = async (file: File) => {
    setBgPct(0);
    const fd = new FormData(); fd.append("file", file);
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/upload.php`);
      if (adminPassword) xhr.setRequestHeader("x-admin-pass", adminPassword);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setBgPct(Math.round((e.loaded / e.total) * 100)); };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText || "{}");
          if (xhr.status >= 200 && xhr.status < 300 && json?.url) {
            setSettings({ ...settings, backgroundUrl: json.url, backgroundMode: "image" });
            resolve();
          } else reject(new Error(json?.error || `Upload failed (${xhr.status})`));
        } catch (e: any) { reject(new Error(e?.message || "Bad JSON")); }
      };
      xhr.send(fd);
    }).catch((e) => alert(e?.message || e));
  };

  return (
    <div className="space-y-6 text-slate-900">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm">Title</span>
          <input className="w-full mt-1 px-3 py-2 rounded-xl bg-white border" value={settings.title}
            onChange={(e) => setSettings({ ...settings, title: e.target.value })}/>
        </label>
        <label className="block">
          <span className="text-sm">Subtitle</span>
          <input className="w-full mt-1 px-3 py-2 rounded-xl bg-white border" value={settings.subtitle || ""}
            onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}/>
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm">Footer</span>
          <input className="w-full mt-1 px-3 py-2 rounded-xl bg-white border" value={settings.footer || ""}
            onChange={(e) => setSettings({ ...settings, footer: e.target.value })}/>
        </label>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow space-y-3">
        <div className="flex items-center gap-3">
          <div className="font-semibold">Background</div>
          <label className="flex items-center gap-2">
            <input type="radio" checked={bgMode === "image"} onChange={() => setSettings({ ...settings, backgroundMode: "image" })}/>
            <span>Image</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={bgMode === "gradient"} onChange={() => setSettings({ ...settings, backgroundMode: "gradient" })}/>
            <span>Gradient</span>
          </label>
        </div>

        {bgMode === "image" ? (
          <div>
            <input type="file" accept="image/*" onChange={(e) => e.target.files && onUpload(e.target.files[0])}/>
            {bgPct > 0 && bgPct < 100 && (
              <div className="mt-2 h-2 w-full bg-slate-200 rounded">
                <div className="h-2 bg-green-500 rounded" style={{ width: `${bgPct}%` }} />
              </div>
            )}
            {settings.backgroundUrl && (
              <div className="mt-2 text-xs text-green-700 flex items-center gap-2">
                {/* eslint-disable-next-line */}
                <img src={settings.backgroundUrl} className="h-12 rounded" alt="bg"/>
                <span>Background set ✓</span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm">From</span>
              <input type="color" className="w-full h-10 rounded border" value={gradient.from}
                onChange={(e) => setSettings({ ...settings, bgGradient: { ...gradient, from: e.target.value } })}/>
            </label>
            <label className="block">
              <span className="text-sm">To</span>
              <input type="color" className="w-full h-10 rounded border" value={gradient.to}
                onChange={(e) => setSettings({ ...settings, bgGradient: { ...gradient, to: e.target.value } })}/>
            </label>
            <label className="block">
              <span className="text-sm">Angle</span>
              <input type="number" className="w-full mt-1 px-3 py-2 rounded-xl bg-white border" value={gradient.angle}
                onChange={(e) => setSettings({ ...settings, bgGradient: { ...gradient, angle: Number(e.target.value || 0) } })}/>
            </label>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!settings.allowRepeats} onChange={(e) => setSettings({ ...settings, allowRepeats: !e.target.checked })}/>
          <span>No repeats</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.timerEnabled} onChange={(e) => setSettings({ ...settings, timerEnabled: e.target.checked })}/>
          <span>Countdown</span>
        </label>
        <label className="flex items-center gap-2">
          <span>Seconds</span>
          <input type="number" min={3} max={300} className="w-24 px-3 py-2 rounded-xl bg-white border" value={settings.timerSeconds}
            onChange={(e) => setSettings({ ...settings, timerSeconds: Math.max(3, Math.min(300, parseInt(e.target.value || "0"))) })}/>
        </label>
      </div>
    </div>
  );
}

export default function EditorShell({
  apiBaseUrl = API_BASE,
  initialSettings,
  initialSlug,
}: {
  apiBaseUrl?: string;
  initialSettings: GameSettings;
  initialSlug?: string | null;
}) {
  const [settings, setSettings] = useState<GameSettings>(initialSettings);
  const [adminPassword, setAdminPassword] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [currentSlug, setCurrentSlug] = useState<string | null>(initialSlug || null);

  useEffect(() => {
    console.assert(settings.slices.length >= 1, "At least one slice required");
    console.assert(settings.timerSeconds >= 3 && settings.timerSeconds <= 300, "Timer in range [3..300]");
  }, [settings]);

  const saveNew = async () => {
    const res = await fetch(apiUrl("games"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ settings }),
      credentials: "include",
    });
    const json = await safeJson(res);
    if (res.ok && json?.slug) { setCurrentSlug(json.slug); return json.slug as string; }
    alert(json?.error || "Save failed"); return null;
  };

  const updateExisting = async () => {
    if (!currentSlug) { alert("No slug to update"); return null; }
    const res = await fetch(apiUrl(`games/${currentSlug}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ settings }),
      credentials: "include",
    });
    const json = await safeJson(res);
    if (res.ok) return currentSlug;
    alert(json?.error || "Update failed"); return null;
  };

  const steps = [
    { label: "Basics", content: <Basics settings={settings} setSettings={setSettings} adminPassword={adminPassword} setAdminPassword={setAdminPassword} /> },
    { label: "Slices", content: (
        <div className="space-y-3">
          {settings.slices.map((s, i) => (
            <SliceEditor
              key={s.id}
              slice={s}
              index={i}
              adminPassword={adminPassword}
              onChange={(patch) => {
                const next = [...settings.slices]; next[i] = { ...s, ...patch };
                setSettings({ ...settings, slices: next });
              }}
              onRemove={() => setSettings({ ...settings, slices: settings.slices.filter((x) => x.id !== s.id) })}
            />
          ))}
          <div className="pt-2">
            <button
              className="px-4 py-2 rounded-xl bg-green-600 text-white"
              onClick={() =>
                setSettings({
                  ...settings,
                  slices: [...settings.slices, { id: uid(), label: "New Item", color: DEFAULT_PALETTE[Math.floor(Math.random() * DEFAULT_PALETTE.length)] }],
                })
              }
            >
              + Add Slice
            </button>
          </div>
        </div>
      )},
    { label: "Preview", content: <PreviewModal settings={settings} /> },
    { label: "Publish", content: <PublishPanel currentSlug={currentSlug} settings={settings} onSaveNew={saveNew} onUpdate={updateExisting} /> },
  ] as const;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-6 gap-6 bg-gradient-to-br from-slate-800 to-indigo-900 text-white">
      <div className="w-full max-w-6xl">
        <div className="mb-4">
          <button onClick={() => (window.location.href = "/spinner/admin")} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20">← Return to Admin</button>
        </div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent drop-shadow">{settings.title}</h1>
        {settings.subtitle && <p className="opacity-90 mb-4">{settings.subtitle}</p>}
        <div className="bg-black/40 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-wrap gap-2 mb-6">
            {steps.map((s, i) => (
              <button key={i} onClick={() => setActiveStep(i)} className={`px-4 py-2 rounded-xl ${activeStep === i ? "bg-pink-600" : "bg-white/20"}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="min-h-[520px]">{steps[activeStep].content}</div>
        </div>
      </div>
    </div>
  );
}

function PublishPanel({
  currentSlug, settings, onSaveNew, onUpdate
}: { currentSlug: string | null; settings: GameSettings; onSaveNew: () => Promise<string | null>; onUpdate: () => Promise<string | null>; }) {
  const [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState<string | null>(currentSlug);
  useEffect(() => setSlug(currentSlug), [currentSlug]);
  const url = slug ? `${location.origin}/spinner/game/${encodeURIComponent(slug)}` : null;

  const doSave = async () => {
    setBusy(true);
    try {
      const s = slug ? await onUpdate() : await onSaveNew();
      if (s) setSlug(s);
    } catch (e: any) { alert(e?.message || e); }
    finally { setBusy(false); }
  };

  const downloadQR = () => {
    const canvas = document.querySelector("#qr-publish canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `spinner-${slug || "unsaved"}.png`;
    a.click();
  };

  return (
    <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-bold">Publish</div>
          <div className="text-sm text-slate-600">Save your spinner and get the shareable link & QR code.</div>
        </div>
        <button onClick={doSave} disabled={busy} className={`px-4 py-2 rounded-xl text-white ${busy ? "bg-gray-400" : "bg-pink-600 hover:bg-pink-500"}`}>
          {slug ? (busy ? "Updating…" : "Update") : busy ? "Publishing…" : "Publish"}
        </button>
      </div>

      {url ? (
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="space-y-2">
            <div className="text-sm text-slate-600">Public URL</div>
            <div className="font-mono break-all bg-slate-100 rounded-xl p-3">{url}</div>
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded-xl bg-indigo-600 text-white" onClick={() => navigator.clipboard?.writeText(url)}>Copy URL</button>
              <button className="px-3 py-2 rounded-xl bg-slate-900 text-white" onClick={() => window.open(url, "_blank")}>Open</button>
            </div>
          </div>
          <div id="qr-publish" className="justify-self-center">
            <QRCodeCanvas value={url} size={220} includeMargin />
            <div className="text-center mt-2">
              <button className="px-3 py-2 rounded-xl bg-amber-500 text-black" onClick={downloadQR}>Download QR</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-slate-700">Not published yet. Click <b>Publish</b> to create a link.</div>
      )}
    </div>
  );
}
