import type { DownloadJob, VideoInfo, Format, DownloadType } from '../types';

export async function listDownloads(): Promise<DownloadJob[]> {
  const res = await fetch('/api/downloads');
  if (!res.ok) throw new Error('Failed to list downloads');
  return res.json();
}

export async function fetchInfo(url: string): Promise<VideoInfo> {
  const res = await fetch('/api/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch video info');
  }
  return res.json();
}

export interface StartDownloadOptions {
  url: string;
  title: string;
  author: string;
  thumb: string;
  duration: string;
  website: string;
  type: DownloadType;
  format: Format | null;
}

export async function startDownload(options: StartDownloadOptions): Promise<DownloadJob> {
  const res = await fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) throw new Error('Failed to start download');
  return res.json();
}

export async function cancelDownload(id: string): Promise<void> {
  const res = await fetch(`/api/downloads/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to cancel download');
}

export async function retryDownload(id: string): Promise<void> {
  const res = await fetch(`/api/downloads/${id}/retry`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to retry download');
}

export async function getLog(id: string): Promise<string> {
  const res = await fetch(`/api/logs/${id}`);
  if (!res.ok) throw new Error('Failed to load logs');
  const data = await res.json();
  return data.log;
}
