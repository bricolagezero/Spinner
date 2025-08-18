export const API_BASE = "/spinner/api"; // adjust if needed

export const apiUrl = (path: string) => `${API_BASE}/games.php?path=${encodeURIComponent(path)}`;

export async function safeJson(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const text = await res.text();
  throw new Error(`Expected JSON, got ${res.status} ${res.statusText}. Body: ${text.slice(0, 180)}`);
}
