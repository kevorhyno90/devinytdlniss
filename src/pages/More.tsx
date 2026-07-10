import { useState, useEffect } from 'react';
import { useJobs } from '../contexts';
import { getApiUrl } from '../api/client';

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
  const [showApiSettings, setShowApiSettings] = useState(false);
  
  const [cookies, setCookies] = useState('');
  const [hasCookies, setHasCookies] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [apiUrl, setApiUrl] = useState(localStorage.getItem('api_base_url') || '');
  const [apiSaveMessage, setApiSaveMessage] = useState('');
  const [apiBaseUrlChangedTrigger, setApiBaseUrlChangedTrigger] = useState(0);

  useEffect(() => {
    // Fetch cookies configuration status from the backend
    setHasCookies(false);
    setCookies('');
    fetch(getApiUrl('/api/settings/cookies'))
      .then(res => res.json())
      .then(data => {
        if (data.hasCookies) {
          setHasCookies(true);
          setCookies(data.cookies || '');
        }
      })
      .catch(err => console.error('Failed to load cookies configuration', err));
  }, [apiBaseUrlChangedTrigger]);

  const handleSaveCookies = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const r = await fetch(getApiUrl('/api/settings/cookies'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies })
      });
      const data = await r.json();
      if (data.success) {
        setHasCookies(data.hasCookies);
        setCookies(data.hasCookies ? cookies : '');
        setSaveMessage(data.hasCookies ? '✅ Cookies saved successfully!' : '✅ Cookies cleared.');
      } else {
        setSaveMessage('❌ Failed to update cookies: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      setSaveMessage('❌ Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

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
          name: 'Browser Downloads',
          desc: 'Files save to local disk downloads folder',
          onClick: () => {
            alert('When you click "Save File" on any completed download, the file is saved directly to your computer\'s local Downloads folder.');
          }
        },
        {
          id: 'youtube-cookies',
          icon: '🍪',
          iconBg: 'var(--yellow-dim)',
          name: 'YouTube Cookies (Auth)',
          desc: hasCookies ? '✅ Active cookies configured' : '⚠️ Setup cookies to bypass bot blocks',
          onClick: () => {
            setShowSettings(true);
          }
        },
        {
          id: 'backend-url',
          icon: '🔗',
          iconBg: 'var(--green-dim)',
          name: 'Backend API URL',
          desc: apiUrl ? `Custom: ${apiUrl}` : 'Default: (relative to server)',
          onClick: () => {
            setShowApiSettings(true);
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
              const r = await fetch(getApiUrl('/api/health?_t=' + Date.now()));
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

      {/* Cookies Settings modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85dvh' }}>
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                🍪 YouTube Cookies Setup
              </span>
              <button id="close-cookies" className="btn btn-ghost btn-icon" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px', overflowY: 'auto' }}>
              <div style={{
                background: hasCookies ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                border: hasCookies ? '1px solid var(--green)' : '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                padding: '12px 14px',
                fontSize: 13,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                <div style={{ fontSize: 20 }}>{hasCookies ? '🛡️' : '⚠️'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: hasCookies ? 'var(--green)' : 'var(--t2)' }}>
                    {hasCookies ? 'Authentication Cookies are Active!' : 'YouTube Bot Block Warning'}
                  </div>
                  <div style={{ color: 'var(--t3)', marginTop: 2 }}>
                    {hasCookies 
                      ? 'The server is currently using your pasted Netscape cookies to bypass blocks.' 
                      : 'YouTube blocks cloud server environments with "Sign in to confirm you are not a bot". Pasting Netscape-format cookies fixes this.'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--primary-light)' }}>📋 Setup Instructions:</div>
                <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--t3)' }}>
                  <li>Install a cookie exporter browser extension (e.g., <a href="https://chrome.google.com/webstore/detail/get-cookiestxt-locally/ccmclmdfhdgihgihhjkbicgajjihbdfm" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'underline' }}>Get cookies.txt LOCALLY</a>).</li>
                  <li>Log into <strong>youtube.com</strong> on your computer.</li>
                  <li>Open the extension, select <strong>Netscape</strong> format, and download or copy the cookies content.</li>
                  <li>Paste the text in the box below and click <strong>Save Cookies</strong>.</li>
                </ol>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>Netscape HTTP Cookies Content</label>
                <textarea
                  value={cookies}
                  onChange={(e) => setCookies(e.target.value)}
                  placeholder="# Netscape HTTP Cookie File&#10;# http://curl.haxx.se/rfc/cookie_spec.html&#10;# This file is generated by yt-dlp...&#10;.youtube.com	TRUE	/	TRUE	1800000000	__Secure-3PAPISID	..."
                  style={{
                    width: '100%',
                    height: '200px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    lineHeight: 1.4,
                    padding: '12px',
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    color: 'var(--t1)',
                    resize: 'vertical'
                  }}
                />
              </div>

              {saveMessage && (
                <div style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: saveMessage.startsWith('✅') ? 'var(--green)' : 'var(--red)',
                  marginBottom: 16
                }}>
                  {saveMessage}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveCookies}
                  disabled={isSaving}
                  style={{ flex: 1 }}
                >
                  {isSaving ? 'Saving...' : 'Save Cookies'}
                </button>
                {hasCookies && (
                  <button
                     className="btn btn-ghost"
                    onClick={() => {
                      setCookies('');
                      setTimeout(() => handleSaveCookies(), 50);
                    }}
                    disabled={isSaving}
                    style={{ border: '1px solid var(--border)', color: 'var(--red)' }}
                  >
                    Clear Cookies
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backend API URL Settings Modal */}
      {showApiSettings && (
        <div className="modal-overlay" onClick={() => setShowApiSettings(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '75dvh' }}>
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                🔗 Configure Backend URL
              </span>
              <button id="close-api-url" className="btn btn-ghost btn-icon" onClick={() => setShowApiSettings(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.5, marginBottom: 16 }}>
                If you host this PWA on a static hosting platform like Vercel, it needs a running backend server to execute <code>yt-dlp</code>. 
                <br /><br />
                Enter the full URL of your running backend (e.g., <code>https://my-backend-app.railway.app</code>). Keep empty to use relative paths.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>Backend Base URL</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://your-backend-service.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--bg-1)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    color: 'var(--t1)',
                    fontSize: '13px'
                  }}
                />
              </div>

              {apiSaveMessage && (
                <div style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--green)',
                  marginBottom: 16
                }}>
                  {apiSaveMessage}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const trimmed = apiUrl.trim();
                    if (trimmed) {
                      localStorage.setItem('api_base_url', trimmed);
                      setApiSaveMessage('✅ Custom Backend API URL saved successfully!');
                    } else {
                      localStorage.removeItem('api_base_url');
                      setApiSaveMessage('✅ Reverted to default relative paths.');
                    }
                    setApiUrl(trimmed);
                    setApiBaseUrlChangedTrigger(prev => prev + 1);
                    setTimeout(() => setApiSaveMessage(''), 3000);
                  }}
                  style={{ flex: 1 }}
                >
                  Save URL
                </button>
                {localStorage.getItem('api_base_url') && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      localStorage.removeItem('api_base_url');
                      setApiUrl('');
                      setApiBaseUrlChangedTrigger(prev => prev + 1);
                      setApiSaveMessage('✅ Backend URL cleared. Using relative paths.');
                      setTimeout(() => setApiSaveMessage(''), 3000);
                    }}
                    style={{ border: '1px solid var(--border)', color: 'var(--red)' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
