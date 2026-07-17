import type { VideoInfo, DownloadJob, DownloadType, Format, HistoryEntry, CommandTemplate } from '../types';

export const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export function getToken() {
  return localStorage.getItem('ytdlnis_token');
}

export function setToken(token: string) {
  localStorage.setItem('ytdlnis_token', token);
}

export function clearToken() {
  localStorage.removeItem('ytdlnis_token');
}

async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Check backend health */
export async function getHealth(): Promise<{ ok: boolean; ytdlp: boolean }> {
  const res = await authFetch(`${BASE}/health`);
  return json(res);
}

/** Fetch video metadata + formats from URL */
export async function fetchInfo(url: string): Promise<VideoInfo> {
  const res = await authFetch(`${BASE}/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  return json(res);
}

/** Start a download */
export async function startDownload(opts: {
  url: string;
  title: string;
  author: string;
  thumb: string;
  duration: string;
  website: string;
  type: DownloadType;
  format: Format | null;
}): Promise<DownloadJob> {
  const res = await authFetch(`${BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts)
  });
  return json(res);
}

/** List all download jobs */
export async function listDownloads(): Promise<DownloadJob[]> {
  const res = await authFetch(`${BASE}/downloads`);
  return json(res);
}

/** Cancel / delete a job */
export async function cancelDownload(id: string): Promise<void> {
  await authFetch(`${BASE}/downloads/${id}`, { method: 'DELETE' });
}

/** Retry a failed/cancelled job */
export async function retryDownload(id: string): Promise<void> {
  await authFetch(`${BASE}/downloads/${id}/retry`, { method: 'POST' });
}

/** Get yt-dlp log for a job */
export async function getLog(id: string): Promise<string> {
  const res = await authFetch(`${BASE}/logs/${id}`);
  const data: { log: string } = await json(res);
  return data.log;
}

// ─── Sync APIs ───────────────────────────────────────────────────────────────

export async function syncHistory(entries: HistoryEntry[]) {
  const res = await authFetch(`${BASE}/sync/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entries)
  });
  return json(res);
}

export async function fetchRemoteHistory(): Promise<any[]> {
  const res = await authFetch(`${BASE}/sync/history`);
  return json(res);
}

export async function syncTemplates(entries: CommandTemplate[]) {
  const res = await authFetch(`${BASE}/sync/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entries)
  });
  return json(res);
}

export async function fetchRemoteTemplates(): Promise<any[]> {
  const res = await authFetch(`${BASE}/sync/templates`);
  return json(res);
}

