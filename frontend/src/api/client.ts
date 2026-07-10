import type { VideoInfo, DownloadJob, DownloadType, Format } from '../types';

const BASE = '/api';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Check backend health */
export async function getHealth(): Promise<{ ok: boolean; ytdlp: boolean }> {
  const res = await fetch(`${BASE}/health`);
  return json(res);
}

/** Fetch video metadata + formats from URL */
export async function fetchInfo(url: string): Promise<VideoInfo> {
  const res = await fetch(`${BASE}/info`, {
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
  const res = await fetch(`${BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts)
  });
  return json(res);
}

/** List all download jobs */
export async function listDownloads(): Promise<DownloadJob[]> {
  const res = await fetch(`${BASE}/downloads`);
  return json(res);
}

/** Cancel / delete a job */
export async function cancelDownload(id: string): Promise<void> {
  await fetch(`${BASE}/downloads/${id}`, { method: 'DELETE' });
}

/** Retry a failed/cancelled job */
export async function retryDownload(id: string): Promise<void> {
  await fetch(`${BASE}/downloads/${id}/retry`, { method: 'POST' });
}

/** Get yt-dlp log for a job */
export async function getLog(id: string): Promise<string> {
  const res = await fetch(`${BASE}/logs/${id}`);
  const data: { log: string } = await json(res);
  return data.log;
}

// ─── Teams API ───────────────────────────────────────────────────────────────
export type Team = { id: string; name: string; members: string[]; shopAccess: boolean };

export async function listTeams(): Promise<Team[]> {
  const res = await fetch(`${BASE}/teams`);
  return json(res);
}

export async function createTeam(name: string): Promise<Team> {
  const res = await fetch(`${BASE}/teams`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
  return json(res);
}

export async function deleteTeam(id: string): Promise<void> {
  await fetch(`${BASE}/teams/${id}`, { method: 'DELETE' });
}

export async function patchTeam(id: string, body: Partial<{ shopAccess: boolean; name: string }>): Promise<Team> {
  const res = await fetch(`${BASE}/teams/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return json(res);
}

export async function addTeamMember(id: string, member: string): Promise<Team> {
  const res = await fetch(`${BASE}/teams/${id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member }) });
  return json(res);
}

export async function removeTeamMember(id: string, member: string): Promise<Team> {
  const res = await fetch(`${BASE}/teams/${id}/members`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member }) });
  return json(res);
}

