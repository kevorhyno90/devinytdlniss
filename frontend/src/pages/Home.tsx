import { useState, useEffect } from 'react';
import type { VideoInfo, DownloadType, Format } from '../types';
import { fetchInfo, startDownload } from '../api/client';
import { useToast } from '../App';
import FormatPicker from '../components/FormatPicker';

interface Props {
  onGoToQueue: () => void;
}

type HomeState = 'idle' | 'loading' | 'result' | 'error';

export default function Home({ onGoToQueue }: Props) {
  const { addToast } = useToast();
  const [url, setUrl] = useState('');
  const [state, setState] = useState<HomeState>('idle');
  const [results, setResults] = useState<VideoInfo[]>([]);
  const [type, setType] = useState<DownloadType>('video');
  const [formatMap, setFormatMap] = useState<Record<string, Format>>({});
  const [activePickerInfo, setActivePickerInfo] = useState<VideoInfo | null>(null);
  const [downloadingUrls, setDownloadingUrls] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState('');
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  // Check backend on mount
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setBackendOk(d.ytdlp))
      .catch(() => setBackendOk(false));
  }, []);

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
    setResults([]);
    setFormatMap({});
    setErrorMsg('');

    try {
      const data = await fetchInfo(trimmed);
      setResults(data);
      setState('result');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch info';
      setErrorMsg(msg);
      setState('error');
    }
  };

  const handleDownload = async (info: VideoInfo) => {
    setDownloadingUrls((prev) => new Set(prev).add(info.url));
    const format = formatMap[info.url] || null;
    
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
      setDownloadingUrls((prev) => {
        const next = new Set(prev);
        next.delete(info.url);
        return next;
      });
    }
  };

  return (
    <div>
      {/* Hero */}
      <div className="home-hero">
        <div className="home-logo">🎬</div>
        <div className="home-logo-title">YTDLnis</div>
        <div className="home-logo-sub">Download videos & audio from anywhere</div>
      </div>

      {/* Backend warning */}
      {backendOk === false && (
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
          <strong>⚠ yt-dlp not found.</strong> Please install yt-dlp and ensure it's in your PATH.
          <br />
          <span style={{ color: 'var(--t3)' }}>Download: github.com/yt-dlp/yt-dlp</span>
        </div>
      )}

      {/* Search section */}
      <div className="home-search-section">
        {/* URL Input */}
        <div className="home-url-row">
          <input
            id="url-input"
            className="home-url-input"
            placeholder="Paste a URL or search (e.g. 'sad music')"
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
              onClick={() => { setType(t); setFormatMap({}); }}
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
              Fetching info…
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

      {/* Result list */}
      {state === 'result' && results.length > 0 && (
        <div style={{ paddingBottom: 20 }}>
          {results.map((info, i) => {
            const format = formatMap[info.url] || null;
            const formatLabel = format
              ? format.format_note || `${format.height ? format.height + 'p' : ''} ${format.container}`.trim()
              : 'Best Quality';
            const downloading = downloadingUrls.has(info.url);

            return (
              <div key={`${info.url}-${i}`} className="result-card">
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
                        className="result-format-btn"
                        onClick={() => setActivePickerInfo(info)}
                      >
                        ⚙ {formatLabel}
                      </button>
                    )}
                    <button
                      className="result-download-btn"
                      onClick={() => handleDownload(info)}
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
            );
          })}
        </div>
      )}

      {/* Format picker modal */}
      {activePickerInfo && (
        <FormatPicker
          formats={activePickerInfo.formats}
          selected={formatMap[activePickerInfo.url] || null}
          onSelect={(f) => { 
            setFormatMap(prev => ({ ...prev, [activePickerInfo.url]: f })); 
            setActivePickerInfo(null); 
          }}
          onClose={() => setActivePickerInfo(null)}
          type={type === 'audio' ? 'audio' : 'video'}
        />
      )}
    </div>
  );
}
