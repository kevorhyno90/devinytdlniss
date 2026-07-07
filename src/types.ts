export type DownloadType = 'video' | 'audio' | 'auto';

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

export interface VideoInfo {
  url: string;
  title: string;
  author: string;
  thumb: string;
  duration: string;
  website: string;
  formats: Format[];
}

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
  status: 'queued' | 'active' | 'completed' | 'errored' | 'cancelled';
  progress: number;
  speed: string;
  eta: string;
  size: string;
  downloadPath: string;
  createdAt: number;
  completedAt: number | null;
  log: string;
  error?: string;
}

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

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
  filesize: number;
  website: string;
}
