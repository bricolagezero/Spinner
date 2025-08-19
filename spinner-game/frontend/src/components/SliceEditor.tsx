import { useState } from "react";
import { Slice } from "../types";
import { uploadFile } from "../utils/upload";
import { API_BASE } from "../utils/api";

export default function SliceEditor({
  slice, index, onChange, onRemove, adminPassword,
}: {
  slice: Slice; index: number; onChange: (p: Partial<Slice>) => void; onRemove: () => void; adminPassword: string;
}) {
  const [pctIcon, setPctIcon] = useState(0);
  const [pctOut, setPctOut] = useState(0);

  const send = async (f: File, kind: "icon" | "out") => {
    const { url } = await uploadFile(`${API_BASE}/upload.php`, f, {
      onProgress: (p) => (kind === "icon" ? setPctIcon(p) : setPctOut(p)),
      adminPassword,
    });
    return url;
  };

  return (
    <div className="rounded-xl p-4 bg-white flex flex-col gap-3 text-slate-900 shadow">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Slice {index + 1}</div>
        <button onClick={onRemove} className="px-3 py-1 rounded bg-red-600 text-white">Delete</button>
      </div>

      <input className="px-2 py-2 rounded border" value={slice.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="Label" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">Color</span>
          <input type="color" value={slice.color} onChange={(e) => onChange({ color: e.target.value })} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Font size</span>
          <input type="number" className="w-24 px-2 py-1 rounded border" value={slice.outcomeFontSize ?? 20}
                 onChange={(e) => onChange({ outcomeFontSize: Math.max(12, Math.min(72, parseInt(e.target.value || "20"))) })}/>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Image scale</span>
          <input type="range" min={20} max={120} value={Math.round((slice.outcomeImageScale ?? 0.6) * 100)}
                 onChange={(e) => onChange({ outcomeImageScale: Math.max(0.2, Math.min(1.2, parseInt(e.target.value)/100)) })}/>
          <span className="text-xs">{Math.round((slice.outcomeImageScale ?? 0.6) * 100)}%</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm">Icon (optional)</span>
        <input type="file" accept="image/*" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          const url = await send(f, "icon"); onChange({ iconUrl: url });
        }}/>
        {pctIcon > 0 && <div className="h-2 w-24 bg-slate-200 rounded overflow-hidden"><div className="h-2 bg-blue-500" style={{ width: `${pctIcon}%` }} /></div>}
        {slice.iconUrl && <img src={slice.iconUrl} className="h-8 w-8 object-contain rounded" alt="icon" />}
      </div>

      <textarea className="px-2 py-2 rounded border" rows={2} value={slice.outcomeText || ""} onChange={(e) => onChange({ outcomeText: e.target.value })} placeholder="Outcome text" />

      <div>
        <span className="text-sm">Outcome Image</span>
        <div className="mt-1 flex items-center gap-2">
          <input type="file" accept="image/*" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const url = await send(f, "out"); onChange({ outcomeImageUrl: url });
          }}/>
          {pctOut > 0 && <div className="h-2 w-24 bg-slate-200 rounded overflow-hidden"><div className="h-2 bg-green-500" style={{ width: `${pctOut}%` }} /></div>}
          {slice.outcomeImageUrl && <img src={slice.outcomeImageUrl} className="h-12 w-12 object-cover rounded" alt="outcome" />}
        </div>
      </div>
    </div>
  );
}
