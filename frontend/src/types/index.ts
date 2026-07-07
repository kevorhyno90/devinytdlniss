// ─── Download Types ────────────────────────────────────────────────────────────

export type DownloadType = 'auto' | 'audio' | 'video' | 'command';
export type DownloadStatus = 'queued' | 'active' | 'completed' | 'errored' | 'cancelled';

// ─── Format ───────────────────────────────────────────────────────────────────

export interface Format {
  format_id: string;
  container: string;
  vcodec: string;
  acodec: string;
  filesize: number;
  format_note: string;
  fps?: string;
  width?: number | null;
  height?: number | null;
  tbr?: string;
}

// ─── Video Info (from /api/info) ──────────────────────────────────────────────

export interface VideoInfo {
  url: string;
  title: string;
  author: string;
  thumb: string;
  duration: string;
  website: string;
  formats: Format[];
}

// ─── Download Job (from backend) ──────────────────────────────────────────────

export interface DownloadJob {
  id: string;
  url: string;
  title: string;
  author: string;
  thumb: string;
  duration: string;
  website: string;
  type: DownloadType;
  format: Format | null;
  status: DownloadStatus;
  progress: number;
  speed: string;
  eta: string;
  size: string;
  downloadPath: string;
  filename?: string;
  createdAt: number;
  completedAt: number | null;
  log: string;
  error: string;
}

// ─── History (IndexedDB) ──────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  author: string;
  thumb: string;
  duration: string;
  type: DownloadType;
  format: Format | null;
  completedAt: number;
  downloadPath: string;
  filename?: string;
  filesize: number;
  website: string;
}

// ─── Command Template (IndexedDB) ─────────────────────────────────────────────

export interface CommandTemplate {
  id: string;
  name: string;
  template: string;
  createdAt: number;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}
