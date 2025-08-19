// spinner-game/frontend/src/utils/api.ts

export const API_BASE = "/spinner/api"; // adjust if hosted elsewhere

type ListResponse = { games: { slug: string; updated_at?: string }[] };
type GetResponse = { slug: string; settings: any; updated_at?: string };
type CreateResponse = { slug: string };

async function toJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

/* ---------- AUTH (optional if you use session cookie) ---------- */
export async function login(password: string) {
  const res = await fetch(`${API_BASE}/login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });
  return toJson<{ ok: true }>(res);
}

/* ---------- GAMES ---------- */
export async function listGames(): Promise<ListResponse> {
  const res = await fetch(`${API_BASE}/games.php?path=games`, {
    method: "GET",
    credentials: "include",
  });
  return toJson<ListResponse>(res);
}

export async function getGame(slug: string): Promise<GetResponse> {
  const res = await fetch(`${API_BASE}/games.php?path=games/${encodeURIComponent(slug)}`, {
    method: "GET",
    credentials: "include",
  });
  return toJson<GetResponse>(res);
}

export async function createGame(settings: any): Promise<string> {
  const res = await fetch(`${API_BASE}/games.php?path=games`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ settings }),
  });
  const data = await toJson<CreateResponse>(res);
  if (!data.slug) throw new Error("Create failed: missing slug");
  return data.slug;
}

export async function updateGame(slug: string, settings: any) {
  const res = await fetch(`${API_BASE}/games.php?path=games/${encodeURIComponent(slug)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ settings }),
  });
  return toJson<{ ok: true }>(res);
}

export async function duplicateGame(slug: string, adminPass?: string): Promise<string> {
  const res = await fetch(
    `${API_BASE}/games.php?path=games/${encodeURIComponent(slug)}/duplicate`,
    {
      method: "POST",
      headers: {
        ...(adminPass ? { "x-admin-pass": adminPass } : {}),
      },
      credentials: "include",
    }
  );
  const data = await toJson<CreateResponse>(res);
  if (!data.slug) throw new Error("Duplicate failed: missing slug");
  return data.slug;
}

/* ---------- UPLOADS ---------- */
export async function uploadImage(file: File, adminPass?: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/upload.php`, {
    method: "POST",
    headers: {
      ...(adminPass ? { "x-admin-pass": adminPass } : {}),
    },
    credentials: "include",
    body: form,
  });
  const data = await toJson<{ url: string }>(res);
  if (!data.url) throw new Error("Upload failed: missing url");
return data.url;
  return data.url;
}
