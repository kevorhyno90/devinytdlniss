import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';
import type { DownloadJob, ToastType, HistoryEntry } from './types';

// ─── Toast Context ─────────────────────────────────────────────────────────────

interface ToastCtx {
  addToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastCtx>({ addToast: () => {} });
export const useToast = () => useContext(ToastContext);

// ─── Jobs Context ──────────────────────────────────────────────────────────────

interface JobsCtx {
  jobs: DownloadJob[];
  setJobs: Dispatch<SetStateAction<DownloadJob[]>>;
}

export const JobsContext = createContext<JobsCtx>({ jobs: [], setJobs: () => {} });
export const useJobs = () => useContext(JobsContext);

// ─── Player Context ────────────────────────────────────────────────────────────

interface PlayerCtx {
  activeMedia: DownloadJob | HistoryEntry | null;
  setActiveMedia: (media: DownloadJob | HistoryEntry | null) => void;
}

export const PlayerContext = createContext<PlayerCtx>({
  activeMedia: null,
  setActiveMedia: () => {},
});
export const usePlayer = () => useContext(PlayerContext);
