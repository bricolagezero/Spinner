import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getGame, updateGame, createGame, uploadImage } from "../utils/api";
import { GameSettings } from "../types";
import WheelPanel from "../components/WheelPanel";
import SliceEditor from "../components/SliceEditor";
import PreviewModal from "../components/PreviewModal";
import { defaultSettings } from "../utils/defaults";
import { InputModal } from "../components/InputModal";
import { extractColorsFromImage } from "../utils/colorExtractor";

export default function EditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isNewSpinner, setIsNewSpinner] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [brandedImageUploading, setBrandedImageUploading] = useState(false);

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
          setShowNameModal(true);
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
        const newSlug = await createGame(settings);
        alert("Created successfully!");
        nav(`/admin/edit/${newSlug}`);
        setIsNewSpinner(false);
      } else {
        // Update existing game
        await updateGame(slug!, settings);
        alert("Saved successfully!");
      }
    } catch (e: any) {
      console.error("Save error:", e);
      alert(e.message || "Save failed");
    }
  }

  const handleNameSubmit = (name: string) => {
    if (settings) {
      setSettings({ ...settings, title: name });
    }
    setShowNameModal(false);
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setSettings(prev => prev ? { ...prev, backgroundUrl: url } : null);
    } catch (error) {
      alert('Failed to upload background image');
    } finally {
      setUploading(false);
    }
  };

  const handleBrandedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setBrandedImageUploading(true);
    try {
      const url = await uploadImage(file);
      const colors = await extractColorsFromImage(url);
      setSettings(prev => prev ? { 
        ...prev, 
        brandedImageUrl: url,
        brandColors: colors 
      } : null);
    } catch (error) {
      alert('Failed to upload branded image');
    } finally {
      setBrandedImageUploading(false);
    }
  };

  const getNextColor = () => {
    if (!settings?.brandColors?.length) {
      // Default palette if no brand colors
      const defaultColors = ["#e74c3c", "#e67e22", "#f39c12", "#f1c40f", "#2ecc71", "#27ae60", "#3498db", "#2980b9", "#9b59b6", "#8e44ad", "#e91e63", "#c0392b"];
      return defaultColors[(settings?.slices?.length || 0) % defaultColors.length];
    }
    
    // Get unused brand color
    const usedColors = new Set(settings.slices?.map(s => s.color) || []);
    for (const color of settings.brandColors) {
      if (!usedColors.has(color)) return color;
    }
    // If all used, cycle through
    return settings.brandColors[(settings.slices?.length || 0) % settings.brandColors.length];
  };

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
                <label className="block text-sm font-medium mb-2">Creator:</label>
                <input
                  value={settings.creator || ""}
                  onChange={(e) => setSettings({ ...settings, creator: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Footer Text:</label>
                <input
                  value={settings.footer || ""}
                  onChange={(e) => setSettings({ ...settings, footer: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Footer text (optional)"
                />
              </div>
              
              <div className="border-t border-slate-600 pt-4">
                <h3 className="text-lg font-semibold mb-3">Game Options</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={!settings.allowRepeats}
                      onChange={(e) => setSettings({ ...settings, allowRepeats: !e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span>Gray out slices after they're landed on</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.timerEnabled}
                      onChange={(e) => setSettings({ ...settings, timerEnabled: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span>Enable countdown timer</span>
                  </label>
                  
                  {settings.timerEnabled && (
                    <div className="ml-7 space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm">Minutes:</label>
                        <input
                          type="number"
                          value={settings.timerMinutes || 0}
                          onChange={(e) => setSettings({ ...settings, timerMinutes: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-20 px-2 py-1 rounded bg-slate-700 border border-slate-600"
                          min="0"
                          max="59"
                        />
                        <label className="text-sm">Seconds:</label>
                        <input
                          type="number"
                          value={settings.timerSeconds || 0}
                          onChange={(e) => setSettings({ ...settings, timerSeconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
                          className="w-20 px-2 py-1 rounded bg-slate-700 border border-slate-600"
                          min="0"
                          max="59"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t border-slate-600 pt-4">
                <h3 className="text-lg font-semibold mb-3">Branding</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Branded Image (for color palette):</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBrandedImageUpload}
                      disabled={brandedImageUploading}
                      className="text-sm"
                    />
                    {brandedImageUploading && <span className="ml-2 text-sm text-gray-400">Processing colors...</span>}
                    {settings.brandedImageUrl && (
                      <div className="mt-2">
                        <img 
                          src={settings.brandedImageUrl} 
                          alt="Brand" 
                          className="h-20 rounded cursor-pointer hover:scale-105 transition-transform" 
                          onClick={() => window.open(settings.brandedImageUrl, '_blank')}
                        />
                        {settings.brandColors && (
                          <div className="mt-2 flex gap-1">
                            {settings.brandColors.map((color, i) => (
                              <div
                                key={i}
                                className="w-6 h-6 rounded border border-gray-600"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-600 pt-4">
                <h3 className="text-lg font-semibold mb-3">Background</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Background Image:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundUpload}
                      disabled={uploading}
                      className="text-sm"
                    />
                    {uploading && <span className="ml-2 text-sm text-gray-400">Uploading...</span>}
                    {settings.backgroundUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <img 
                          src={settings.backgroundUrl} 
                          alt="Background" 
                          className="h-20 rounded cursor-pointer hover:scale-105 transition-transform" 
                          onClick={() => window.open(settings.backgroundUrl, '_blank')}
                        />
                        <button
                          onClick={() => setSettings({ ...settings, backgroundUrl: '' })}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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
                  color: getNextColor(),
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
                  settings={settings}
                  onChange={(patch) => {
                    const newSlices = [...settings.slices];
                    newSlices[i] = { ...slice, ...patch };
                    setSettings({ ...settings, slices: newSlices });
                  }}
                  onRemove={() => {
                    setSettings({ ...settings, slices: settings.slices.filter((_, idx) => idx !== i) });
                  }}
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

      {showNameModal && (
        <InputModal
          isOpen={true}
          onClose={() => setShowNameModal(false)}
          onSubmit={handleNameSubmit}
          title="Name Your Spinner"
          placeholder="Enter spinner name"
          defaultValue="New Spin Game"
        />
      )}
    </div>
  );
}
