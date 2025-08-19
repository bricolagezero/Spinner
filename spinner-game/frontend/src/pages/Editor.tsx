import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getGame, updateGame, createGame, uploadImage, login } from "../utils/api";
import { GameSettings } from "../types";
import WheelPanel from "../components/WheelPanel";
import SliceEditor from "../components/SliceEditor";
import PreviewModal from "../components/PreviewModal";
import { defaultSettings } from "../utils/defaults";
import { InputModal } from "../components/InputModal";
import { extractColorsFromImage } from "../utils/colorExtractor";
import { LoginModal } from "../components/LoginModal";

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
  const [showLogin, setShowLogin] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Add utilities and handlers referenced in JSX
  const DEFAULT_COLORS = ['#2563eb','#7c3aed','#dc2626','#f59e0b','#16a34a','#0891b2','#d946ef','#f43f5e'];

  const handleNameSubmit = (name: string) => {
    if (!settings) return;
    setSettings({ ...settings, title: name });
    setShowNameModal(false);
  };

  const getNextColor = () => {
    if (!settings) return DEFAULT_COLORS[0];
    const palette = (settings.brandColors && settings.brandColors.length > 0) ? settings.brandColors : DEFAULT_COLORS;
    return palette[settings.slices.length % palette.length];
  };

  const handleBrandedImageUpload = async (e: any) => {
    if (!settings) return;
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      setBrandedImageUploading(true);
      const url = await uploadImage(file);
      let colors: string[] = [];
      try {
        colors = await extractColorsFromImage(url);
      } catch {
        colors = [];
      }
      setSettings({
        ...settings,
        brandedImageUrl: url,
        brandColors: colors && colors.length > 0 ? colors : settings.brandColors || DEFAULT_COLORS,
      });
    } catch (error: any) {
      setErr(error?.message || "Failed to process branded image");
    } finally {
      setBrandedImageUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleBackgroundUpload = async (e: any) => {
    if (!settings) return;
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await uploadImage(file);
      setSettings({ ...settings, backgroundUrl: url });
    } catch (error: any) {
      setErr(error?.message || "Failed to upload background image");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const onSave = async () => {
    if (!settings) return;
    try {
      setLoading(true);
      if (isNewSpinner) {
        const res: any = await createGame(settings);
        setIsNewSpinner(false);
        if (res?.slug) {
          nav(`/editor/${res.slug}`);
        }
      } else if (slug) {
        await updateGame(slug, settings);
      }
    } catch (error: any) {
      setErr(error?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (password: string) => {
    await login(password);
    setIsAuthenticated(true);
    setShowLogin(false);
  };

  useEffect(() => {
    // Require login each visit
    setShowLogin(true);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    (async () => {
      if (!slug || !isAuthenticated) return;
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
  }, [slug, isAuthenticated]);

  // Show login modal BEFORE any loading UI to avoid stuck "Loading…"
  if (showLogin && !isAuthenticated) {
    return <LoginModal onLogin={handleLogin} />;
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
                    <span>Enable global countdown timer</span>
                  </label>
                  
                  {settings.timerEnabled && (
                    <div className="ml-7 space-y-2">
                      <p className="text-xs text-gray-400">This timer shows for the entire session</p>
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
                      <p className="text-xs text-gray-400 mt-2">You can also set per-slice timers in the Slices tab</p>
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
                                className="w-6 h-6 rounded-full border border-gray-600"
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
            {settings.brandColors && settings.brandColors.length > 0 && (
              <div className="mb-6 p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
                <h3 className="text-sm font-medium mb-2">Brand Colors</h3>
                <div className="flex gap-2">
                  {settings.brandColors.map((color, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-gray-600 cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={`Click to copy: ${color}`}
                      onClick={() => {
                        navigator.clipboard.writeText(color);
                        alert(`Copied ${color} to clipboard!`);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
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

      {showLogin && !isAuthenticated && (
        <LoginModal onLogin={handleLogin} />
      )}
    </div>
  );
}
