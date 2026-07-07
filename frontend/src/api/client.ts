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
