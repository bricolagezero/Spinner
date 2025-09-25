import { useState } from "react";
import type { Slice, GameSettings } from "../types";
import { uploadFile } from "../utils/upload";
import { API_BASE } from "../utils/api";
import { Eye } from "lucide-react";
import { SlicePreviewModal } from "./SlicePreviewModal";

export default function SliceEditor({
  slice, index, settings, onChange, onRemove,
}: {
  slice: Slice; 
  index: number; 
  settings: GameSettings;
  onChange: (p: Partial<Slice>) => void; 
  onRemove: () => void;
}) {
  const [pctIcon, setPctIcon] = useState(0);
  const [pctOut, setPctOut] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const send = async (f: File, kind: "icon" | "out") => {
    try {
      const { url } = await uploadFile(`${API_BASE}/upload.php`, f, {
        onProgress: (p) => (kind === "icon" ? setPctIcon(p) : setPctOut(p)),
      });
      return url;
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  return (
    <>
      <div className="rounded-xl p-4 bg-white flex flex-col gap-3 text-slate-900 shadow">
        <div className="flex items-center justify-between">
          <div className="font-semibold flex items-center gap-2">
            Slice {index + 1}
            <button
              onClick={() => setShowPreview(true)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Preview slice"
            >
              <Eye size={16} />
            </button>
          </div>
          <button onClick={onRemove} className="px-3 py-1 rounded bg-red-600 text-white">Delete</button>
        </div>

        {/* Label + toggle for different pop-up text */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <input
              className="flex-1 px-2 py-2 rounded border"
              value={slice.label}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="Label shown on wheel"
            />
            <label className="flex items-center gap-2 text-sm select-none">
              <input
                type="checkbox"
                checked={slice.sameHeadingAsLabel === false}
                onChange={(e) => onChange({ sameHeadingAsLabel: !e.target.checked })}
              />
              Different text for slice pop up
            </label>
          </div>
          {slice.sameHeadingAsLabel === false && (
            <input
              className="px-2 py-2 rounded border"
              value={slice.modalHeading || ""}
              onChange={(e) => onChange({ modalHeading: e.target.value })}
              placeholder="Pop-up heading (H2)"
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">Color</span>
            <input type="color" value={slice.color} onChange={(e) => onChange({ color: e.target.value })} />
            {settings.brandColors && settings.brandColors.length > 0 && (
              <div className="flex gap-1">
                {settings.brandColors.map((color, i) => (
                  <button
                    key={i}
                    className="w-6 h-6 rounded-full border border-gray-400 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                    onClick={() => onChange({ color })}
                  />
                ))}
              </div>
            )}
          </div>
          {/* Removed per-slice font size control; font is now auto-sized globally based on longest label */}
          <div className="flex items-center gap-2">
            <span className="text-sm">Image scale</span>
            <input type="range" min={20} max={100} value={Math.round((slice.outcomeImageScale ?? 0.6) * 100)}
                   onChange={(e) => onChange({ outcomeImageScale: Math.max(0.2, Math.min(1, parseInt(e.target.value)/100)) })} />
            <span className="text-xs">{Math.round((slice.outcomeImageScale ?? 0.6) * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Timer (seconds)</span>
            <input 
              type="number" 
              className="w-24 px-2 py-1 rounded border" 
              value={slice.timerSeconds || 0} 
              onChange={(e) => onChange({ timerSeconds: parseInt(e.target.value) || 0 })} 
              min="0"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm">Icon (optional)</span>
          <input type="file" accept="image/*" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const url = await send(f, "icon"); onChange({ iconUrl: url });
          }} />
          {pctIcon > 0 && <div className="h-2 w-24 bg-slate-200 rounded overflow-hidden"><div className="h-2 bg-blue-500" style={{ width: `${pctIcon}%` }} /></div>}
          {slice.iconUrl && (
            <>
              <img 
                src={slice.iconUrl} 
                className="h-8 w-8 object-contain rounded cursor-pointer hover:scale-110 transition-transform" 
                alt="icon"
                onClick={() => window.open(slice.iconUrl, '_blank')}
                title="Click to view full size"
              />
              <button
                onClick={() => onChange({ iconUrl: '' })}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                Remove
              </button>
            </>
          )}
        </div>

        <textarea className="px-2 py-2 rounded border" rows={2} value={slice.outcomeText || ""} onChange={(e) => onChange({ outcomeText: e.target.value })} placeholder="Outcome text" />

        <div>
          <span className="text-sm">Outcome Image</span>
          <div className="mt-1 flex items-center gap-2">
            <input type="file" accept="image/*" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const url = await send(f, "out"); onChange({ outcomeImageUrl: url });
            }} />
            {pctOut > 0 && (
              <div className="h-2 w-24 bg-slate-200 rounded overflow-hidden">
                <div className="h-2 bg-green-500" style={{ width: `${pctOut}%` }} />
              </div>
            )}
            {slice.outcomeImageUrl && (
              <>
                <img 
                  src={slice.outcomeImageUrl} 
                  className="h-12 w-12 object-cover rounded cursor-pointer hover:scale-110 transition-transform" 
                  alt="outcome"
                  onClick={() => window.open(slice.outcomeImageUrl, '_blank')}
                  title="Click to view full size"
                />
                <button
                  onClick={() => onChange({ outcomeImageUrl: '' })}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <SlicePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        slice={slice}
        settings={settings}
      />
    </>
  );
}
