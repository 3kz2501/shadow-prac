const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function postForm<T>(path: string, data: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: data });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

export function audioUrl(path: string): string {
  return `${BASE}${path}`;
}

export function ttsWordUrl(word: string): string {
  return `${BASE}/api/tts/word?text=${encodeURIComponent(word)}`;
}

export function chunkTtsUrl(chunkId: string): string {
  return `${BASE}/api/chunks/${chunkId}/tts`;
}

export function chunkAudioUrl(chunkId: string): string {
  return `${BASE}/api/chunks/${chunkId}/audio`;
}

export function scoreRecordingUrl(scoreId: string): string {
  return `${BASE}/api/scores/${scoreId}/recording`;
}
