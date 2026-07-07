import type { Format } from '../types';

interface Props {
  formats: Format[];
  selected: Format | null;
  onSelect: (format: Format) => void;
  onClose: () => void;
  type: 'video' | 'audio' | 'auto';
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return 'Unknown Size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

export default function FormatPicker({ formats, selected, onSelect, onClose, type }: Props) {
  // Filter formats based on active type selection (video vs audio)
  const filtered = formats.filter((f) => {
    if (type === 'audio') {
      // Audio-only formats: either no video codec, or explicit audio format
      return f.vcodec === 'none' || (f.acodec !== 'none' && f.vcodec === 'none');
    } else if (type === 'video') {
      // Video formats: must have video codec
      return f.vcodec !== 'none';
    }
    return true; // auto / all
  });

  // Sort formats so higher resolution / better quality comes first
  const sorted = [...filtered].sort((a, b) => {
    const aHeight = a.height || 0;
    const bHeight = b.height || 0;
    if (bHeight !== aHeight) return bHeight - aHeight;
    return (b.filesize || 0) - (a.filesize || 0);
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80dvh' }}>
        <div className="modal-handle" />
        <div className="modal-header">
          <span className="modal-title">⚙️ Select Stream Format</span>
          <button id="close-picker" className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--t3)' }}>
              No formats available for {type} mode.
            </div>
          ) : (
            sorted.map((f, idx) => {
              const isSel = selected?.format_id === f.format_id;
              const hasVideo = f.vcodec !== 'none';
              const name = f.format_note || `${f.height ? f.height + 'p' : ''} ${f.container}`.trim() || 'Custom Stream';
              const detail = [
                f.container.toUpperCase(),
                hasVideo ? `${f.height ? f.height + 'p' : ''}${f.fps ? ` (${f.fps}fps)` : ''}` : 'AUDIO ONLY',
                f.vcodec !== 'none' && f.vcodec !== 'any' ? `Video: ${f.vcodec}` : null,
                f.acodec !== 'none' && f.acodec !== 'any' ? `Audio: ${f.acodec}` : null,
              ].filter(Boolean).join(' · ');

              return (
                <div
                  key={f.format_id || idx}
                  id={`format-option-${f.format_id}`}
                  className={`format-row${isSel ? ' selected' : ''}`}
                  onClick={() => onSelect(f)}
                >
                  <div className="format-icon">
                    {hasVideo ? '🎬' : '🎵'}
                  </div>
                  <div className="format-info">
                    <div className="format-name">{name}</div>
                    <div className="format-detail">{detail}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="format-size">{formatBytes(f.filesize)}</span>
                    <div className="format-check">
                      {isSel && '✓'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
