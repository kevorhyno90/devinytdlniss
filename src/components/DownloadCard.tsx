import { useState } from 'react';
import type { DownloadJob } from '../types';
import { cancelDownload, retryDownload, getLog, getApiUrl } from '../api/client';
import { useToast, usePlayer } from '../contexts';

interface Props {
  job: DownloadJob;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(1)} ${units[i]}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function typeEmoji(type: string): string {
  if (type === 'audio') return '🎵';
  if (type === 'video') return '🎬';
  return '📥';
}

export default function DownloadCard({ job }: Props) {
  const { addToast } = useToast();
  const { setActiveMedia } = usePlayer();
  const [showLog, setShowLog] = useState(false);
  const [log, setLog] = useState('');

  const handleCancel = async () => {
    try {
      await cancelDownload(job.id);
      addToast('Download cancelled', 'info');
    } catch {
      addToast('Failed to cancel', 'error');
    }
  };

  const handleRetry = async () => {
    try {
      await retryDownload(job.id);
      addToast('Retrying download...', 'success');
    } catch {
      addToast('Failed to retry', 'error');
    }
  };

  const handleLog = async () => {
    try {
      const text = await getLog(job.id);
      setLog(text || '(no output yet)');
      setShowLog(true);
    } catch {
      addToast('Failed to load log', 'error');
    }
  };

  const isActive    = job.status === 'active';
  const isQueued    = job.status === 'queued';
  const isCompleted = job.status === 'completed';
  const isErrored   = job.status === 'errored';
  const isCancelled = job.status === 'cancelled';

  return (
    <>
      <div className="dl-card" id={`dl-card-${job.id}`}>
        {/* Thumbnail */}
        {job.thumb ? (
          <img
            className="dl-thumb"
            src={job.thumb}
            alt=""
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="dl-thumb-placeholder">
            {typeEmoji(job.type)}
          </div>
        )}

        {/* Body */}
        <div className="dl-body">
          <div className="dl-title">{job.title}</div>

          {/* Meta row */}
          <div className="dl-meta">
            <span className={`badge badge-${job.status}`}>
              {isActive && <span className="spinner" style={{ width: 10, height: 10, marginRight: 4 }} />}
              {job.status}
            </span>
            <span className={`badge badge-${job.type}`}>{job.type}</span>
            {job.duration && <span className="dl-meta-text">{job.duration}</span>}
          </div>

          {/* Progress bar */}
          {(isActive || (isQueued && job.progress > 0)) && (
            <div style={{ marginTop: 6 }}>
              <div className="progress-track">
                <div
                  className={`progress-fill${isActive ? ' active' : ''}`}
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <div className="dl-stats" style={{ marginTop: 5 }}>
                <span className="dl-stat">
                  <span style={{ fontSize: 10 }}>⬇</span>
                  {job.progress.toFixed(1)}%
                </span>
                {job.speed && (
                  <span className="dl-stat">
                    <span style={{ fontSize: 10 }}>⚡</span>
                    {job.speed}
                  </span>
                )}
                {job.eta && job.eta !== 'Processing...' && (
                  <span className="dl-stat">
                    <span style={{ fontSize: 10 }}>⏱</span>
                    {job.eta}
                  </span>
                )}
                {job.eta === 'Processing...' && (
                  <span className="dl-stat" style={{ color: 'var(--cyan)' }}>
                    ⚙ Processing…
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error message */}
          {isErrored && job.error && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
              ✕ {job.error}
            </div>
          )}

          {/* Completed info */}
          {isCompleted && job.completedAt && (
            <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>
              ✓ Done · {formatDate(job.completedAt)}
            </div>
          )}

          {/* Actions */}
          <div className="dl-actions">
            {(isActive || isQueued) && (
              <button
                id={`cancel-${job.id}`}
                className="btn btn-sm btn-danger"
                onClick={handleCancel}
              >
                ✕ Cancel
              </button>
            )}
            {(isErrored || isCancelled) && (
              <button
                id={`retry-${job.id}`}
                className="btn btn-sm btn-secondary"
                onClick={handleRetry}
              >
                ↺ Retry
              </button>
            )}
            {isCompleted && (
              <>
                <button
                  id={`play-${job.id}`}
                  className="btn btn-sm btn-primary"
                  onClick={() => setActiveMedia(job)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  ▶ Play
                </button>
                <a
                  id={`save-file-${job.id}`}
                  className="btn btn-sm btn-success"
                  href={getApiUrl(`/api/download-file/${job.id}`)}
                  download
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                >
                  💾 Save File
                </a>
              </>
            )}
            {(isErrored || isActive || isCompleted) && (
              <button
                id={`log-${job.id}`}
                className="btn btn-sm btn-ghost"
                onClick={handleLog}
                title="View log"
              >
                📋 Log
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Log viewer */}
      {showLog && (
        <div className="log-viewer" onClick={() => setShowLog(false)}>
          <div className="log-header" onClick={(e) => e.stopPropagation()}>
            <span style={{ fontSize: 20 }}>📋</span>
            <span className="log-title truncate">{job.title}</span>
            <button
              id={`close-log-${job.id}`}
              className="btn btn-ghost btn-icon"
              onClick={() => setShowLog(false)}
            >
              ✕
            </button>
          </div>
          <div className="log-body" onClick={(e) => e.stopPropagation()}>
            <pre className="log-pre">{log || '(empty)'}</pre>
          </div>
        </div>
      )}
    </>
  );
}
