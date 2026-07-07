import { useState } from 'react';
import { useJobs } from '../App';

interface MoreItem {
  id: string;
  icon: string;
  iconBg: string;
  name: string;
  desc: string;
  onClick: () => void;
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{
      flex: 1,
      padding: '14px 12px',
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function More() {
  const { jobs } = useJobs();
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const totalDone      = jobs.filter((j) => j.status === 'completed').length;
  const totalActive    = jobs.filter((j) => j.status === 'active').length;
  const totalErrored   = jobs.filter((j) => j.status === 'errored').length;

  const sections: { label: string; items: MoreItem[] }[] = [
    {
      label: 'Tools',
      items: [
        {
          id: 'open-downloads',
          icon: '📁',
          iconBg: 'var(--cyan-dim)',
          name: 'Output Folder',
          desc: 'Files saved to ~/Downloads/YTDLnis',
          onClick: () => {
            // Can't open folder from browser, show info
            alert('Files are saved to:\n~/Downloads/YTDLnis\n\n(Your home folder → Downloads → YTDLnis)');
          }
        },
        {
          id: 'ytdlp-info',
          icon: '🔧',
          iconBg: 'var(--primary-dim)',
          name: 'yt-dlp Version',
          desc: 'Check backend status',
          onClick: async () => {
            try {
              const r = await fetch('/api/health');
              const d = await r.json();
              alert(d.ytdlp
                ? '✅ yt-dlp is installed and available!'
                : '❌ yt-dlp is NOT found in PATH.\n\nInstall from:\nhttps://github.com/yt-dlp/yt-dlp#installation');
            } catch {
              alert('❌ Backend is not running.\n\nStart the backend with:\nnode backend/server.js');
            }
          }
        }
      ]
    },
    {
      label: 'App',
      items: [
        {
          id: 'more-about',
          icon: 'ℹ',
          iconBg: 'var(--bg-4)',
          name: 'About YTDLnis PWA',
          desc: 'Version 1.0 · Built with ❤',
          onClick: () => setShowAbout(true)
        },
        {
          id: 'more-ytdlp-link',
          icon: '🌐',
          iconBg: 'var(--green-dim)',
          name: 'yt-dlp GitHub',
          desc: 'The engine powering downloads',
          onClick: () => window.open('https://github.com/yt-dlp/yt-dlp', '_blank')
        }
      ]
    }
  ];

  return (
    <div className="more-page">
      {/* Hero */}
      <div className="more-hero">
        <div className="more-logo">🎬</div>
        <div className="more-app-name">YTDLnis PWA</div>
        <div className="more-version">Powered by yt-dlp</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10 }}>
        <StatCard label="Completed"  value={totalDone}    color="var(--green)"   />
        <StatCard label="Active"     value={totalActive}  color="var(--cyan)"    />
        <StatCard label="Errored"    value={totalErrored} color="var(--red)"     />
        <StatCard label="Total"      value={jobs.length}  color="var(--primary-light)" />
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.label} className="more-section">
          <div className="more-section-label">{section.label}</div>
          {section.items.map((item) => (
            <button
              key={item.id}
              id={item.id}
              className="more-item"
              onClick={item.onClick}
            >
              <div className="more-item-icon" style={{ background: item.iconBg }}>
                {item.icon}
              </div>
              <div className="more-item-text">
                <div className="more-item-name">{item.name}</div>
                <div className="more-item-desc">{item.desc}</div>
              </div>
              <span className="more-item-arrow">›</span>
            </button>
          ))}
        </div>
      ))}

      {/* Supported sites note */}
      <div style={{
        padding: '14px 16px',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        fontSize: 13,
        color: 'var(--t3)',
        lineHeight: 1.6
      }}>
        <div style={{ fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>
          🌍 Supported Sites
        </div>
        yt-dlp supports 1000+ sites including YouTube, SoundCloud, Twitter/X, TikTok,
        Vimeo, Twitch, Reddit, Instagram, and many more.
      </div>

      {/* About modal */}
      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '50dvh' }}>
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title">About</span>
              <button id="close-about" className="btn btn-ghost btn-icon" onClick={() => setShowAbout(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>🎬</div>
              <div style={{ fontSize: 22, fontWeight: 900, background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                YTDLnis PWA
              </div>
              <div style={{ color: 'var(--t3)', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
                A Progressive Web App clone of the YTDLnis Android app,
                built with React + Vite. Connects to a local yt-dlp backend server.
              </div>
              <div style={{ marginTop: 16, color: 'var(--t4)', fontSize: 12 }}>
                Original app by Denis Cerri · github.com/deniscerri/ytdlnis
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
