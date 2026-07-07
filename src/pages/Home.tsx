import { useState, useEffect } from 'react';
import type { VideoInfo, DownloadType, Format } from '../types';
import { fetchInfo, startDownload, getApiUrl } from '../api/client';
import { useToast } from '../contexts';
import FormatPicker from '../components/FormatPicker';

interface Props {
  onGoToQueue: () => void;
}

type HomeState = 'idle' | 'loading' | 'result' | 'error';

export default function Home({ onGoToQueue }: Props) {
  const { addToast } = useToast();
  const [url, setUrl] = useState('');
  const [state, setState] = useState<HomeState>('idle');
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [type, setType] = useState<DownloadType>('video');
  const [format, setFormat] = useState<Format | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  type BackendStatus = 'checking' | 'connected' | 'ytdlp_missing' | 'disconnected';
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  const [inputApiUrl, setInputApiUrl] = useState(localStorage.getItem('api_base_url') || '');
  const [recheckTrigger, setRecheckTrigger] = useState(0);

  // Check backend on mount
  useEffect(() => {
    setBackendStatus('checking');
    fetch(getApiUrl('/api/health?_t=' + Date.now()))
      .then((r) => {
        if (!r.ok) throw new Error('Not OK');
        return r.json();
      })
      .then((d) => {
        if (d && d.ytdlp) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('ytdlp_missing');
        }
      })
      .catch(() => {
        setBackendStatus('disconnected');
      });
  }, [recheckTrigger]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) setUrl(text.trim());
    } catch {
      addToast('Could not read clipboard', 'warning');
    }
  };

  const handleAnalyze = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setState('loading');
    setInfo(null);
    setFormat(null);
    setErrorMsg('');

    try {
      const data = await fetchInfo(trimmed);
      setInfo(data);
      setState('result');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch info';
      setErrorMsg(msg);
      setState('error');
    }
  };

  const handleDownload = async () => {
    if (!info) return;
    setDownloading(true);
    try {
      await startDownload({
        url: info.url,
        title: info.title,
        author: info.author,
        thumb: info.thumb,
        duration: info.duration,
        website: info.website,
        type,
        format
      });
      addToast('Download started!', 'success');
      onGoToQueue();
    } catch {
      addToast('Failed to start download', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const formatLabel =
    format
      ? format.format_note || `${format.height ? format.height + 'p' : ''} ${format.container}`.trim()
      : 'Best Quality';

  return (
    <div>
      {/* Hero */}
      <div className="home-hero">
        <div className="home-logo">🎬</div>
        <div className="home-logo-title">YTDLnis</div>
        <div className="home-logo-sub">Download videos & audio from anywhere</div>
      </div>

      {/* Backend warning */}
      {backendStatus === 'ytdlp_missing' && (
        <div
          style={{
            margin: '0 16px 16px',
            padding: '12px 16px',
            background: 'var(--red-dim)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 'var(--r-md)',
            fontSize: 13,
            color: 'var(--red)',
            lineHeight: 1.5
          }}
        >
          <strong>⚠ yt-dlp not found.</strong> Please install yt-dlp on your backend server.
          <br />
          <span style={{ color: 'var(--t3)' }}>Download: github.com/yt-dlp/yt-dlp</span>
        </div>
      )}

      {backendStatus === 'disconnected' && (
        <div
          style={{
            margin: '0 16px 20px',
            padding: '16px',
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            fontSize: 13,
            color: 'var(--t1)',
            lineHeight: 1.5
          }}
        >
          <div style={{ color: 'var(--red)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            🔌 Cannot connect to the YTDLnis Backend Server
          </div>
          <p style={{ color: 'var(--t2)', fontSize: 12.5, marginBottom: 12 }}>
            Since you are running on a static platform like Vercel, the app needs to connect to your active backend server (e.g. on Railway, Render, or Cloud Run) to run <code>yt-dlp</code>.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={inputApiUrl}
              onChange={(e) => setInputApiUrl(e.target.value)}
              placeholder="https://your-backend-service.com"
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '8px 12px',
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                color: 'var(--t1)',
                fontSize: 13
              }}
            />
            <button
              className="btn btn-primary"
              onClick={() => {
                const trimmed = inputApiUrl.trim();
                if (trimmed) {
                  localStorage.setItem('api_base_url', trimmed);
                } else {
                  localStorage.removeItem('api_base_url');
                }
                setRecheckTrigger(prev => prev + 1);
              }}
              style={{ padding: '8px 16px' }}
            >
              Connect
            </button>
          </div>
        </div>
      )}

      {/* Search section */}
      <div className="home-search-section">
        {/* URL Input */}
        <div className="home-url-row">
          <input
            id="url-input"
            className="home-url-input"
            placeholder="Paste link OR search for song/video name..."
            value={url}
            onChange={(e) => { setUrl(e.target.value); setState('idle'); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            autoComplete="off"
            spellCheck={false}
          />
          <button id="paste-btn" className="home-paste-btn" onClick={handlePaste}>
            📋 Paste
          </button>
        </div>

        {/* Type selector */}
        <div className="home-type-row">
          {(['video', 'audio', 'auto'] as DownloadType[]).map((t) => (
            <button
              key={t}
              id={`type-${t}`}
              className={`type-chip${type === t ? ' active' : ''}`}
              onClick={() => { setType(t); setFormat(null); }}
            >
              {t === 'video' ? '🎬' : t === 'audio' ? '🎵' : '⚡'}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Analyze button */}
        <button
          id="analyze-btn"
          className="home-analyze-btn"
          onClick={handleAnalyze}
          disabled={!url.trim() || state === 'loading'}
        >
          {state === 'loading' ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span className="spinner" />
              Searching / Analyzing…
            </span>
          ) : (
            '🔍 Search & Analyze'
          )}
        </button>
      </div>

      {/* Error */}
      {state === 'error' && (
        <div
          style={{
            margin: '16px 16px 0',
            padding: '14px 16px',
            background: 'var(--red-dim)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--r-md)',
            fontSize: 14,
            color: 'var(--red)',
            animation: 'fadeUp 0.3s ease both'
          }}
        >
          ✕ {errorMsg}
        </div>
      )}

      {/* Result card */}
      {state === 'result' && info && (
        <div className="result-card">
          {/* Thumbnail */}
          <div className="result-thumb-container">
            {info.thumb ? (
              <img className="result-thumb" src={info.thumb} alt={info.title} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, opacity: 0.3
              }}>
                {type === 'audio' ? '🎵' : '🎬'}
              </div>
            )}
            <div className="result-thumb-overlay" />
            {info.duration && (
              <span className="result-duration">{info.duration}</span>
            )}
          </div>

          <div className="result-body">
            <div className="result-title">{info.title}</div>
            {info.author && (
              <div className="result-author">by {info.author}</div>
            )}

            {/* Format + website row */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {info.website && (
                <span className="badge badge-auto">🌐 {info.website}</span>
              )}
              <span className={`badge badge-${type}`}>
                {type === 'video' ? '🎬' : type === 'audio' ? '🎵' : '⚡'} {type}
              </span>
              {info.formats.length > 0 && (
                <span className="badge badge-queued">
                  {info.formats.length} formats
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="result-actions">
              {info.formats.length > 0 && (
                <button
                  id="format-picker-btn"
                  className="result-format-btn"
                  onClick={() => setShowPicker(true)}
                >
                  ⚙ {formatLabel}
                </button>
              )}
              <button
                id="download-btn"
                className="result-download-btn"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <><span className="spinner" /> Adding…</>
                ) : (
                  <>⬇ Download</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Format picker modal */}
      {showPicker && info && (
        <FormatPicker
          formats={info.formats}
          selected={format}
          onSelect={(f) => { setFormat(f); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
          type={type === 'auto' ? 'video' : (type === 'command' ? 'auto' : type)}
        />
      )}
    </div>
  );
}
