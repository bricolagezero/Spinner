import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { createGame, getGame, login } from "../utils/api";
import { defaultSettings } from "../utils/defaults";
import { UrlModal } from "../components/UrlModal";
import { QrCodeModal } from "../components/QrCodeModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { LoginModal } from "../components/LoginModal";

type GameListItem = { slug: string; updated_at?: string };

export default function AdminPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<GameListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [creators, setCreators] = useState<Record<string, string>>({});
  const [urlModalSlug, setUrlModalSlug] = useState<string | null>(null);
  const [qrModalSlug, setQrModalSlug] = useState<string | null>(null);
  const [deleteModalSlug, setDeleteModalSlug] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [fontSize, setFontSize] = useState<string>('16');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/spinner/api/games.php?path=games", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) {
          setShowLogin(true);
          setIsAuthenticated(false);
          return;
        }
        throw new Error(`List failed: ${res.status}`);
      }
      // If we got here, we're authenticated
      setShowLogin(false);
      setIsAuthenticated(true);
      
      const data = await res.json();
      const games = data.games ?? [];
      setList(games);
      
      // Fetch titles and creators for display
      const titleEntries: Record<string, string> = {};
      const creatorEntries: Record<string, string> = {};
      for (const g of games) {
        try {
          const gameData = await getGame(g.slug);
          titleEntries[g.slug] = gameData?.settings?.title || g.slug;
          creatorEntries[g.slug] = gameData?.settings?.creator || '';
        } catch {}
      }
      setTitles(titleEntries);
      setCreators(creatorEntries);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  const handleLogin = async (password: string) => {
    try {
      await login(password);
      setIsAuthenticated(true);
      setShowLogin(false);
      await load();
    } catch (e) {
      throw e;
    }
  };

  useEffect(() => {
    // Try to load; if backend says 401 we'll prompt for login
    load();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('app:fontSizePx');
    const initial = stored && /^\d+$/.test(stored)
      ? stored
      : (getComputedStyle(document.documentElement)
          .getPropertyValue('--app-font-size')
          .replace('px', '')
          .trim() || '16');
    setFontSize(initial);
    document.documentElement.style.setProperty('--app-font-size', `${initial}px`);
  }, []);

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9]/g, '');
    setFontSize(v);
    if (v) {
      document.documentElement.style.setProperty('--app-font-size', `${v}px`);
      localStorage.setItem('app:fontSizePx', v);
    }
  };

  async function onNewSpinner() {
    try {
      const name = window.prompt("Name your spinner:", "New Spin Game") || "New Spin Game";
      const settings = defaultSettings();
      settings.title = name;
      const slug = await createGame(settings);
      nav(`/admin/edit/${slug}`);
    } catch (e: any) {
      alert(e.message || "Failed to create spinner");
      load();
    }
  }

  async function handleDelete(slug: string) {
    try {
      const res = await fetch(`/spinner/api/games.php?path=games/${slug}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Delete failed');
      setDeleteModalSlug(null);
      await load();
    } catch (e: any) {
      alert(e.message || "Failed to delete spinner");
    }
  }

  if (showLogin && !isAuthenticated) {
    return <LoginModal onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold m-0">Spinners</h1>
            <p className="text-gray-400 mt-1">Create, edit, and share</p>
          </div>
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
                  <h3 className="font-bold text-lg mb-1">{titles[g.slug] || g.slug}</h3>
                  {creators[g.slug] && (
                    <p className="text-sm text-gray-400">By: {creators[g.slug]}</p>
                  )}
                  <p className="text-gray-400 text-sm mb-4">
                    {g.updated_at ? new Date(g.updated_at).toLocaleString() : "—"}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => nav(`/admin/edit/${g.slug}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setUrlModalSlug(g.slug)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      View URL
                    </button>
                    <button 
                      onClick={() => setQrModalSlug(g.slug)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      View QR
                    </button>
                    <button 
                      onClick={() => setDeleteModalSlug(g.slug)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Delete
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

        {deleteModalSlug && (
          <ConfirmModal
            isOpen={true}
            onClose={() => setDeleteModalSlug(null)}
            onConfirm={() => handleDelete(deleteModalSlug)}
            title="Delete Spinner"
            message={`Are you sure you want to delete "${titles[deleteModalSlug] || deleteModalSlug}"? This action cannot be undone.`}
          />
        )}

        <button
          onClick={onNewSpinner}
          className="fixed bottom-4 left-4 z-[9999] bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
        >
          + New Spinner
        </button>
      </div>
    </div>
  );
}

