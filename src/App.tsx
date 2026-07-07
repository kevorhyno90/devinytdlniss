import { useState, useEffect, useCallback } from 'react';
import type { DownloadJob, Toast, ToastType, HistoryEntry } from './types';
import { listDownloads, getApiUrl } from './api/client';
import { ToastContext, JobsContext, PlayerContext } from './contexts';
import Navbar from './components/Navbar';
import ToastContainer from './components/Toast';
import Player from './components/Player';
import Home from './pages/Home';
import Queue from './pages/Queue';
import History from './pages/History';
import More from './pages/More';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function upsertJob(prev: DownloadJob[], job: DownloadJob): DownloadJob[] {
  const idx = prev.findIndex((j) => j.id === job.id);
  if (idx === -1) return [job, ...prev];
  const next = [...prev];
  next[idx] = job;
  return next;
}

// ─── App ───────────────────────────────────────────────────────────────────────

type Tab = 'home' | 'queue' | 'history' | 'more';

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeMedia, setActiveMedia] = useState<DownloadJob | HistoryEntry | null>(null);

  // ── Load initial jobs ─────────────────────────────────────────────────────
  useEffect(() => {
    listDownloads()
      .then(setJobs)
      .catch(() => {}); // backend might not be running yet
  }, []);

  // ── SSE real-time updates ─────────────────────────────────────────────────
  useEffect(() => {
    let source: EventSource;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      source = new EventSource(getApiUrl('/api/events'));

      source.addEventListener('job', (e: MessageEvent) => {
        try {
          const job: DownloadJob = JSON.parse(e.data);
          setJobs((prev) => upsertJob(prev, job));
        } catch {}
      });

      source.onerror = () => {
        source.close();
        retryTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      source?.close();
      clearTimeout(retryTimer);
    };
  }, []);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  const activeCount = jobs.filter((j) => j.status === 'active' || j.status === 'queued').length;

  return (
    <ToastContext.Provider value={{ addToast }}>
      <JobsContext.Provider value={{ jobs, setJobs }}>
        <PlayerContext.Provider value={{ activeMedia, setActiveMedia }}>
          <div className="app">
            <div className="page-wrapper">
              {tab === 'home'    && <Home    onGoToQueue={() => setTab('queue')} />}
              {tab === 'queue'   && <Queue   />}
              {tab === 'history' && <History />}
              {tab === 'more'    && <More    />}
            </div>

            <Navbar tab={tab} setTab={setTab} activeCount={activeCount} />
            <Player activeMedia={activeMedia} onClose={() => setActiveMedia(null)} />
            <ToastContainer toasts={toasts} />
          </div>
        </PlayerContext.Provider>
      </JobsContext.Provider>
    </ToastContext.Provider>
  );
}
