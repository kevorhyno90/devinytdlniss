import { useState } from 'react';
import type { DownloadJob, DownloadStatus } from '../types';
import { useJobs } from '../App';
import DownloadCard from '../components/DownloadCard';

type QueueTab = 'all' | 'active' | 'queued' | 'errored' | 'cancelled' | 'completed';

const TABS: { id: QueueTab; label: string }[] = [
  { id: 'all',       label: 'All'       },
  { id: 'active',    label: 'Active'    },
  { id: 'queued',    label: 'Queued'    },
  { id: 'completed', label: 'Done'      },
  { id: 'errored',   label: 'Errored'   },
  { id: 'cancelled', label: 'Cancelled' },
];

function filterJobs(jobs: DownloadJob[], tab: QueueTab): DownloadJob[] {
  if (tab === 'all') return jobs;
  return jobs.filter((j) => j.status === (tab as DownloadStatus));
}

export default function Queue() {
  const { jobs } = useJobs();
  const [activeTab, setActiveTab] = useState<QueueTab>('all');

  const counts: Record<QueueTab, number> = {
    all:       jobs.length,
    active:    jobs.filter((j) => j.status === 'active').length,
    queued:    jobs.filter((j) => j.status === 'queued').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    errored:   jobs.filter((j) => j.status === 'errored').length,
    cancelled: jobs.filter((j) => j.status === 'cancelled').length,
  };

  const visible = filterJobs(jobs, activeTab);

  return (
    <div>
      <div className="queue-header">
        <div className="queue-title-row">
          <h1 className="page-title">Downloads</h1>
          {counts.active > 0 && (
            <span className="badge badge-active">
              <span className="spinner" style={{ width: 10, height: 10 }} />
              {counts.active} active
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`queue-tab-${t.id}`}
              className={`tab${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
              {counts[t.id] > 0 && (
                <span className="tab-count">{counts[t.id]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="dl-list">
        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {activeTab === 'all' ? '📭' : activeTab === 'completed' ? '✅' : '📂'}
            </div>
            <div className="empty-title">
              {activeTab === 'all' ? 'No downloads yet' : `No ${activeTab} downloads`}
            </div>
            <div className="empty-text">
              {activeTab === 'all'
                ? 'Go to Home to start a new download'
                : `Downloads in ${activeTab} state will appear here`}
            </div>
          </div>
        ) : (
          visible.map((job) => (
            <DownloadCard key={job.id} job={job} />
          ))
        )}
      </div>
    </div>
  );
}
