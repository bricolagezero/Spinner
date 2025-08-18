export const API_BASE = "/spinner/api"; // adjust if you mounted elsewhere

type CreateResponse = { slug: string };

export async function createGame(settings: any, adminPass?: string): Promise<string> {
  const res = await fetch(`${API_BASE}/games.php?path=games`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(adminPass ? { "x-admin-pass": adminPass } : {}),
    },
    credentials: "include", // uses session if logged in
    body: JSON.stringify({ settings }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Create failed: ${res.status} ${txt}`);
  }
  const data = (await res.json()) as CreateResponse;
  if (!data?.slug) throw new Error("Create failed: missing slug");
  return data.slug;
}
