import { useState } from 'react';
import type { Format } from '../types';

interface Props {
  formats: Format[];
  selected: Format | null;
  onSelect: (f: Format | null) => void;
  onClose: () => void;
  type: 'audio' | 'video' | 'auto';
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

function formatLabel(f: Format): string {
  const parts = [];
  if (f.height) parts.push(`${f.height}p`);
  else if (f.format_note) parts.push(f.format_note);
  if (f.fps && f.fps !== '0') parts.push(`${f.fps}fps`);
  if (f.container) parts.push(f.container.toUpperCase());
  return parts.filter(Boolean).join(' · ') || f.format_id;
}

function formatCodecs(f: Format): string {
  const parts = [];
  if (f.vcodec && f.vcodec !== 'none') parts.push(f.vcodec.split('.')[0]);
  if (f.acodec && f.acodec !== 'none') parts.push(f.acodec.split('.')[0]);
  if (f.tbr) parts.push(`${Math.round(parseFloat(f.tbr))}k`);
  return parts.join(' · ');
}

function formatIcon(f: Format): string {
  if (f.vcodec && f.vcodec !== 'none' && f.acodec && f.acodec !== 'none') return '🎬';
  if (f.vcodec && f.vcodec !== 'none') return '📹';
  if (f.acodec && f.acodec !== 'none') return '🎵';
  return '📄';
}

export default function FormatPicker({ formats, selected, onSelect, onClose, type }: Props) {
  const [search, setSearch] = useState('');

  // Filter formats based on type
  const filtered = formats.filter((f) => {
    if (type === 'audio') {
      return f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none');
    }
    if (type === 'video') {
      return f.vcodec && f.vcodec !== 'none';
    }
    return true;
  }).filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.format_id.toLowerCase().includes(q) ||
      f.format_note.toLowerCase().includes(q) ||
      f.container.toLowerCase().includes(q) ||
      (f.height ? `${f.height}p` : '').includes(q)
    );
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="modal-header">
          <span className="modal-title">Select Format</span>
          <button
            id="close-format-picker"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              id="format-search"
              className="search-input"
              placeholder="Search formats…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="modal-body">
          {/* Best option */}
          <div
            id="format-best"
            className={`format-row${selected === null ? ' selected' : ''}`}
            onClick={() => onSelect(null)}
          >
            <div className="format-icon" style={{ background: 'var(--grad-subtle)' }}>⭐</div>
            <div className="format-info">
              <div className="format-name">Best Quality (Auto)</div>
              <div className="format-detail">Let yt-dlp choose the best available</div>
            </div>
            <div className="format-check">
              {selected === null && <span style={{ fontSize: 12 }}>✓</span>}
            </div>
          </div>

          {filtered.length > 0 && (
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
          )}

          {filtered.map((f) => (
            <div
              key={f.format_id}
              id={`format-${f.format_id}`}
              className={`format-row${selected?.format_id === f.format_id ? ' selected' : ''}`}
              onClick={() => onSelect(f)}
            >
              <div className="format-icon">{formatIcon(f)}</div>
              <div className="format-info">
                <div className="format-name">{formatLabel(f)}</div>
                <div className="format-detail">{formatCodecs(f)}</div>
              </div>
              {f.filesize > 0 && (
                <span className="format-size">{formatBytes(f.filesize)}</span>
              )}
              <div className="format-check">
                {selected?.format_id === f.format_id && <span style={{ fontSize: 12 }}>✓</span>}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-text">No formats found</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
