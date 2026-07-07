import type { DownloadJob, HistoryEntry } from '../types';

interface Props {
  job: DownloadJob | HistoryEntry;
  onClose: () => void;
}

export default function PlayerModal({ job, onClose }: Props) {
  const isAudio = job.filename?.endsWith('.mp3') || job.filename?.endsWith('.m4a') || job.type === 'audio';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, background: 'rgba(0,0,0,0.8)' }}>
      <div className="modal-sheet" style={{ maxWidth: 800, padding: 0, overflow: 'hidden', background: '#000' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, paddingRight: 16 }}>
            {job.title}
          </div>
          <a href={job.filename ? `/api/stream/filename/${encodeURIComponent(job.filename)}?download=true` : '#'} download className="btn btn-primary" style={{ marginRight: 8, padding: '4px 12px', fontSize: 12 }}>
            ⬇ Save to PC
          </a>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ color: 'var(--t1)', background: 'var(--bg3)', borderRadius: '50%' }}>
            ✕
          </button>
        </div>

        {/* Player */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: isAudio ? 200 : 400, background: '#000' }}>
          {isAudio ? (
            <div style={{ padding: 40, width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🎵</div>
              {job.filename && (
                <audio 
                  controls 
                  autoPlay 
                  src={`/api/stream/filename/${encodeURIComponent(job.filename)}`} 
                  style={{ width: '100%', maxWidth: 400 }} 
                />
              )}
            </div>
          ) : (
            job.filename && (
              <video 
                controls 
                autoPlay 
                src={`/api/stream/filename/${encodeURIComponent(job.filename)}`} 
                style={{ width: '100%', maxHeight: '70vh' }} 
              />
            )
          )}
        </div>

      </div>
    </div>
  );
}
