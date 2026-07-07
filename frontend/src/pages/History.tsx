import { useState, useEffect } from 'react';
import type { HistoryEntry, DownloadType } from '../types';
import { db } from '../db';
import { useJobs } from '../App';
import PlayerModal from '../components/PlayerModal';

type FilterType = 'all' | DownloadType;

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800000) {
    return d.toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function typeEmoji(type: string): string {
  if (type === 'audio') return '🎵';
  if (type === 'video') return '🎬';
  return '📥';
}

export default function History() {
  const { jobs } = useJobs();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [playingJob, setPlayingJob] = useState<HistoryEntry | null>(null);

  // Sync completed jobs to IndexedDB history
  useEffect(() => {
    const completed = jobs.filter((j) => j.status === 'completed');
    for (const job of completed) {
      const entry: HistoryEntry = {
        id: job.id,
        url: job.url,
        title: job.title,
        author: job.author,
        thumb: job.thumb,
        duration: job.duration,
        type: job.type,
        format: job.format,
        completedAt: job.completedAt || Date.now(),
        downloadPath: job.downloadPath,
        filesize: 0,
        website: job.website
      };
      db.history.put(entry).catch(() => {});
    }
  }, [jobs]);

  // Load history from IndexedDB
  useEffect(() => {
    db.history.orderBy('completedAt').reverse().toArray().then(setHistory);
  }, [jobs]);

  const filtered = history.filter((h) => {
    if (filter !== 'all' && h.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return h.title.toLowerCase().includes(q) || h.author.toLowerCase().includes(q);
    }
    return true;
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.history.delete(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <div>
      <div className="history-header">
        <h1 className="page-title">History</h1>

        {/* Search */}
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            id="history-search"
            className="search-input"
            placeholder="Search history…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'video', 'audio', 'auto'] as FilterType[]).map((f) => (
            <button
              key={f}
              id={`hist-filter-${f}`}
              className={`chip${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '📋 All' : f === 'video' ? '🎬 Video' : f === 'audio' ? '🎵 Audio' : '⚡ Auto'}
            </button>
          ))}
        </div>
      </div>

      <div className="history-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{search ? '🔍' : '📭'}</div>
            <div className="empty-title">{search ? 'No results' : 'No history yet'}</div>
            <div className="empty-text">
              {search
                ? 'Try a different search term'
                : 'Completed downloads will appear here'}
            </div>
          </div>
        ) : (
          filtered.map((h) => (
            <div key={h.id} className="history-card" id={`hist-${h.id}`}>
              {h.thumb ? (
                <img
                  className="history-thumb"
                  src={h.thumb}
                  alt=""
                  onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                />
              ) : (
                <div
                  className="history-thumb"
                  style={{
                    background: 'var(--bg-4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22
                  }}
                >
                  {typeEmoji(h.type)}
                </div>
              )}

              <div className="history-body">
                <div className="history-title">{h.title}</div>
                <div className="history-meta">
                  <span className={`badge badge-${h.type}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                    {typeEmoji(h.type)} {h.type}
                  </span>
                  {h.author && <span className="history-author">{h.author}</span>}
                  <span className="history-date">🕐 {formatDate(h.completedAt)}</span>
                </div>
              </div>

              <button
                className="btn btn-ghost btn-icon"
                onClick={(e) => { e.stopPropagation(); setPlayingJob(h); }}
                title="Play media"
                style={{ flexShrink: 0, color: 'var(--blue)', alignSelf: 'center', marginRight: 8 }}
              >
                ▶
              </button>
              <button
                id={`hist-del-${h.id}`}
                className="btn btn-ghost btn-icon"
                onClick={(e) => handleDelete(h.id, e)}
                title="Remove from history"
                style={{ flexShrink: 0, color: 'var(--t4)', alignSelf: 'center' }}
              >
                🗑
              </button>
            </div>
          ))
        )}
      </div>

      {playingJob && (
        <PlayerModal job={playingJob} onClose={() => setPlayingJob(null)} />
      )}
    </div>
  );
}
