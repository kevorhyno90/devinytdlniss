import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { DownloadJob, Toast, ToastType } from './types';
import { listDownloads } from './api/client';
import Navbar from './components/Navbar';
import ToastContainer from './components/Toast';
import Home from './pages/Home';
import Queue from './pages/Queue';
import History from './pages/History';
import More from './pages/More';
import Login from './pages/Login';
import { getToken } from './api/client';
import { startPeriodicSync } from './api/sync';

// ─── Toast Context ─────────────────────────────────────────────────────────────

interface ToastCtx {
  addToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastCtx>({ addToast: () => {} });
export const useToast = () => useContext(ToastContext);

// ─── Jobs Context ──────────────────────────────────────────────────────────────

interface JobsCtx {
  jobs: DownloadJob[];
  setJobs: React.Dispatch<React.SetStateAction<DownloadJob[]>>;
}

export const JobsContext = createContext<JobsCtx>({ jobs: [], setJobs: () => {} });
export const useJobs = () => useContext(JobsContext);

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

  // ── Load initial jobs & sync ──────────────────────────────────────────────
  useEffect(() => {
    if (getToken()) {
      startPeriodicSync();
      listDownloads()
        .then(setJobs)
        .catch(() => {}); // backend might not be running yet
    }
  }, []);

  // ── SSE real-time updates ─────────────────────────────────────────────────
  useEffect(() => {
    let source: EventSource;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      source = new EventSource('/api/events');

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

  if (!getToken()) {
    return <Login />;
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      <JobsContext.Provider value={{ jobs, setJobs }}>
        <div className="app">
          <div className="page-wrapper">
            {tab === 'home'    && <Home    onGoToQueue={() => setTab('queue')} />}
            {tab === 'queue'   && <Queue   />}
            {tab === 'history' && <History />}
            {tab === 'more'    && <More    />}
          </div>

          <Navbar tab={tab} setTab={setTab} activeCount={activeCount} />
          <ToastContainer toasts={toasts} />
        </div>
      </JobsContext.Provider>
    </ToastContext.Provider>
  );
}
