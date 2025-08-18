import React, { useEffect, useState } from "react";
import { apiUrl, safeJson } from "../utils/api";
import { QRCodeCanvas } from "qrcode.react";

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [games, setGames] = useState<{ slug: string; updated_at?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrSlug, setQrSlug] = useState<string | null>(null);

  const login = async () => {
    const res = await fetch(`/spinner/api/login.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ password: pass }),
      credentials: "include",
    });
    if (res.ok) setAuthed(true);
    else alert("Login failed");
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("games"), { credentials: "include", headers: { Accept: "application/json" } });
      const json = await safeJson(res);
      if (res.ok) setGames(json.games || []);
      else alert(json?.error || "List failed");
    } catch (e: any) { alert(e?.message || e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (authed) refresh(); }, [authed]);

  if (!authed) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-indigo-900 p-6">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-slate-900 shadow-xl">
          <div className="text-2xl font-bold mb-2">Admin Login</div>
          <div className="text-sm text-slate-600 mb-4">Enter your password to manage spinners.</div>
          <input type="password" className="w-full px-3 py-2 rounded-xl border mb-3" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password"/>
          <button className="w-full px-4 py-2 rounded-xl bg-slate-900 text-white" onClick={login}>Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-start p-6 bg-gradient-to-br from-slate-800 to-indigo-900">
      <div className="w-full max-w-5xl bg-white rounded-2xl p-6 text-slate-900 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-2xl font-bold">Spinners</div>
            <div className="text-sm text-slate-600">Create, edit, and share</div>
          </div>
          <button onClick={refresh} className="px-3 py-2 rounded-xl bg-slate-900 text-white">{loading ? "Loading…" : "Refresh"}</button>
        </div>

        <div className="grid gap-3">
          {games.map((g) => (
            <div key={g.slug} className="bg-slate-100 rounded-xl p-4 flex justify-between items-center">
              <div>
                <div className="font-mono text-lg">{g.slug}</div>
                <div className="text-xs text-slate-600">Updated {g.updated_at || ""}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => (window.location.href = `/spinner/admin/edit/${encodeURIComponent(g.slug)}`)} className="px-3 py-2 rounded-xl bg-slate-900 text-white">Edit</button>
                <a href={`/spinner/game/${g.slug}`} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl bg-indigo-600 text-white">Open URL</a>
                <button onClick={() => navigator.clipboard?.writeText(`${location.origin}/spinner/game/${g.slug}`)} className="px-3 py-2 rounded-xl bg-indigo-100 text-slate-900">Copy URL</button>
                <button onClick={() => setQrSlug(g.slug)} className="px-3 py-2 rounded-xl bg-pink-600 text-white">QR</button>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(apiUrl(`games/${g.slug}/duplicate`), {
                        method: "POST", credentials: "include", headers: { Accept: "application/json" },
                      });
                      const j = await safeJson(res);
                      if (res.ok) refresh(); else alert(j?.error || "Duplicate failed");
                    } catch (e: any) { alert(e?.message || e); }
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
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setQrSlug(null)}>
            <div className="bg-white rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-2">Scan to open</div>
              <QRCodeCanvas value={`${location.origin}/spinner/game/${qrSlug}`} size={260} includeMargin />
              <div className="mt-3 text-center text-xs">/spinner/game/{qrSlug}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
