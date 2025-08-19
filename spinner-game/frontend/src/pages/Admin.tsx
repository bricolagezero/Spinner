import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createGame, getGame } from "../utils/api";
import { defaultSettings } from "../utils/defaults";
import { UrlModal } from "../components/UrlModal";
import { QrCodeModal } from "../components/QrCodeModal";

type GameListItem = { slug: string; updated_at?: string };

export default function AdminPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<GameListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [urlModalSlug, setUrlModalSlug] = useState<string | null>(null);
  const [qrModalSlug, setQrModalSlug] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/spinner/api/games.php?path=games", { credentials: "include" });
      if (!res.ok) throw new Error(`List failed: ${res.status}`);
      const data = await res.json();
      const games = data.games ?? [];
      setList(games);
      
      // Fetch titles for display
      const entries: Record<string, string> = {};
      for (const g of games) {
        try {
          const gameData = await getGame(g.slug);
          entries[g.slug] = gameData?.settings?.title || g.slug;
        } catch {}
      }
      setTitles(entries);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onNewSpinner() {
    try {
      const name = window.prompt("Name your spinner:", "New Spin Game") || "New Spin Game";
      const adminPass = window.prompt("Enter admin password:") || "";
      if (!adminPass) {
        alert("Admin password is required");
        return;
      }
      const settings = defaultSettings();
      settings.title = name;
      const slug = await createGame(settings, adminPass);
      nav(`/admin/edit/${slug}`);
    } catch (e: any) {
      alert(e.message || "Failed to create spinner");
      load();
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold m-0">Spinners</h1>
            <p className="text-gray-400 mt-1">Create, edit, and share</p>
          </div>

          <button
            onClick={onNewSpinner}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            + New Spinner
          </button>
        </div>

        <div>
          {loading && <div className="text-center py-8">Loading…</div>}
          {error && <div className="text-red-500 text-center py-8">{error}</div>}

          {!loading && !list.length && <div className="text-gray-400 text-center py-8">No spinners yet.</div>}

          {!!list.length && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {list.map((g) => (
                <div
                  key={g.slug}
                  className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <h3 className="font-bold text-lg mb-2">{titles[g.slug] || g.slug}</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    {g.updated_at ? new Date(g.updated_at).toLocaleString() : "—"}
                  </p>

                  <div className="flex gap-2 flex-wrap">
                    <button 
                      onClick={() => nav(`/admin/edit/${g.slug}`)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setUrlModalSlug(g.slug)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      View URL
                    </button>
                    <button 
                      onClick={() => setQrModalSlug(g.slug)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      View QR Code
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {urlModalSlug && (
          <UrlModal
            isOpen={true}
            onClose={() => setUrlModalSlug(null)}
            url={`${window.location.origin}/spinner/game/${urlModalSlug}`}
          />
        )}

        {qrModalSlug && (
          <QrCodeModal
            isOpen={true}
            onClose={() => setQrModalSlug(null)}
            url={`${window.location.origin}/spinner/game/${qrModalSlug}`}
            spinnerName={titles[qrModalSlug] || qrModalSlug}
          />
        )}
      </div>
    </div>
  );
}
