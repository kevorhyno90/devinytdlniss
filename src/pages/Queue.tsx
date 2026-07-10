import { useState } from 'react';
import { useJobs } from '../contexts';
import DownloadCard from '../components/DownloadCard';

type QueueFilter = 'all' | 'active' | 'finished';

export default function Queue() {
  const { jobs } = useJobs();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<QueueFilter>('active');

  const filtered = jobs.filter((job) => {
    // Filter by status
    if (filter === 'active') {
      if (job.status !== 'active' && job.status !== 'queued') return false;
    } else if (filter === 'finished') {
      if (job.status !== 'completed' && job.status !== 'cancelled' && job.status !== 'errored') return false;
    }

    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        job.title.toLowerCase().includes(q) ||
        job.author.toLowerCase().includes(q) ||
        job.id.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const activeCount = jobs.filter((j) => j.status === 'active' || j.status === 'queued').length;
  const finishedCount = jobs.filter((j) => j.status === 'completed' || j.status === 'cancelled' || j.status === 'errored').length;

  return (
    <div>
      <div className="queue-header">
        <div className="queue-title-row">
          <h1 className="page-title">Downloads</h1>
          {activeCount > 0 && (
            <span className="badge badge-active">
              <span className="spinner" style={{ width: 10, height: 10 }} />
              {activeCount} downloading
            </span>
          )}
        </div>

        {/* Search Input */}
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            id="queue-search"
            className="search-input"
            placeholder="Search downloads…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            id="queue-filter-active"
            className={`chip${filter === 'active' ? ' active' : ''}`}
            onClick={() => setFilter('active')}
          >
            ⚡ Active ({activeCount})
          </button>
          <button
            id="queue-filter-finished"
            className={`chip${filter === 'finished' ? ' active' : ''}`}
            onClick={() => setFilter('finished')}
          >
            ✓ Finished ({finishedCount})
          </button>
          <button
            id="queue-filter-all"
            className={`chip${filter === 'all' ? ' active' : ''}`}
            onClick={() => setFilter('all')}
          >
            📋 All ({jobs.length})
          </button>
        </div>
      </div>

      <div className="dl-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{search ? '🔍' : '📥'}</div>
            <div className="empty-title">
              {search ? 'No downloads match your search' : filter === 'active' ? 'No active downloads' : 'No downloads yet'}
            </div>
            <div className="empty-text">
              {search
                ? 'Try a different keyword or paste a link in the Home tab'
                : filter === 'active'
                ? 'Go to the Home tab and paste a link to start downloading!'
                : 'Completed downloads will appear here'}
            </div>
          </div>
        ) : (
          filtered.map((job) => (
            <DownloadCard key={job.id} job={job} />
          ))
        )}
      </div>
    </div>
  );
}
