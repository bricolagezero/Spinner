import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getGame, updateGame, createGame } from "../utils/api";
import { GameSettings } from "../types";
import WheelPanel from "../components/WheelPanel";
import SliceEditor from "../components/SliceEditor";
import PreviewModal from "../components/PreviewModal";
import { defaultSettings } from "../utils/defaults";

export default function EditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [isNewSpinner, setIsNewSpinner] = useState(false);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      setLoading(true);
      setErr(null);
      try {
        if (slug === 'new') {
          // Create new spinner
          setSettings(defaultSettings());
          setIsNewSpinner(true);
        } else {
          const g = await getGame(slug);
          setSettings(g.settings);
          setIsNewSpinner(false);
        }
      } catch (e: any) {
        setErr(e.message || "Failed to load spinner");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  async function onSave() {
    if (!settings) return;
    try {
      if (isNewSpinner) {
        // Create new game
        const newSlug = await createGame(settings, adminPassword);
        alert("Created successfully!");
        nav(`/admin/edit/${newSlug}`);
      } else {
        // Update existing game
        await updateGame(slug!, settings, adminPassword);
        alert("Saved successfully!");
        nav("/admin");
      }
    } catch (e: any) {
      alert(e.message || "Save failed");
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (err) return <div className="min-h-screen flex items-center justify-center text-red-500">{err}</div>;
  if (!settings) return null;

  const tabs = ["Basics", "Slices", "Preview"];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex gap-4 items-center mb-6">
          <Link to="/admin" className="text-blue-400 hover:text-blue-300 transition-colors">← Back to Admin</Link>
          <h2 className="text-2xl font-bold flex-1">Editor: {settings.title}</h2>
          <button 
            onClick={onSave} 
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Save
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === i 
                  ? "bg-blue-600 text-white" 
                  : "bg-slate-800 text-gray-300 hover:bg-slate-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title:</label>
                <input
                  value={settings.title || ""}
                  onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subtitle:</label>
                <input
                  value={settings.subtitle || ""}
                  onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Admin Password:
                  <span className="text-xs text-gray-400 ml-2">(Required for saving)</span>
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Enter admin password"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 1 && (
          <div>
            <button
              onClick={() => {
                const newSlice = {
                  id: Math.random().toString(36).slice(2, 9),
                  label: `Item ${settings.slices.length + 1}`,
                  color: "#" + Math.floor(Math.random()*16777215).toString(16),
                  outcomeText: "",
                  outcomeImageUrl: "",
                  disabled: false,
                };
                setSettings({ ...settings, slices: [...settings.slices, newSlice] });
              }}
              className="mb-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Add Slice
            </button>
            <div className="space-y-4">
              {settings.slices.map((slice, i) => (
                <SliceEditor
                  key={slice.id}
                  slice={slice}
                  index={i}
                  onChange={(patch) => {
                    const newSlices = [...settings.slices];
                    newSlices[i] = { ...slice, ...patch };
                    setSettings({ ...settings, slices: newSlices });
                  }}
                  onRemove={() => {
                    setSettings({ ...settings, slices: settings.slices.filter((_, idx) => idx !== i) });
                  }}
                  adminPassword={adminPassword}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div>
            <PreviewModal settings={settings} />
            <div className="mt-6">
              <WheelPanel settings={settings} setSettings={setSettings as any} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
