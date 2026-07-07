import { useState, useEffect, useRef } from 'react';
import type { DownloadJob, HistoryEntry } from '../types';
import { getApiUrl } from '../api/client';

interface PlayerProps {
  activeMedia: DownloadJob | HistoryEntry | null;
  onClose: () => void;
}

function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds === undefined) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Player({ activeMedia, onClose }: PlayerProps) {
  if (!activeMedia) return null;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play and handle src loading when activeMedia changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.src = getApiUrl(`/api/stream-file/${activeMedia.id}`);
      videoRef.current.load();
      setIsPlaying(true);
      videoRef.current.play().catch(() => {
        // Handle browser autoplay policy restrictions
        setIsPlaying(false);
      });
    }
  }, [activeMedia]);

  // Handle play / pause toggle
  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Sync state from media element
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (isLooping && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      setIsPlaying(false);
    }
  };

  // Timeline Scrubbing click
  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = pct * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Volume Scrubbing click
  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    videoRef.current.volume = pct;
    setVolume(pct);
    setIsMuted(pct === 0);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const skipTime = (amount: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    let nextTime = videoRef.current.currentTime + amount;
    nextTime = Math.max(0, Math.min(duration, nextTime));
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const toggleLoop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLooping(!isLooping);
  };

  const isVideo = activeMedia.type === 'video' || activeMedia.type === 'auto';
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Hidden media player element */}
      <video
        ref={videoRef}
        className="hidden"
        style={{ display: 'none' }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        playsInline
      />

      {/* COMPACT BOTTOM PLAYER BAR */}
      {!isExpanded && (
        <div
          id="compact-player"
          className="media-player-bar"
          onClick={() => setIsExpanded(true)}
        >
          {activeMedia.thumb ? (
            <img
              className={`player-bar-thumb ${activeMedia.type === 'audio' && isPlaying ? 'player-art-audio' : ''}`}
              src={activeMedia.thumb}
              alt=""
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120'; }}
            />
          ) : (
            <div className="player-bar-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {activeMedia.type === 'audio' ? '🎵' : '🎬'}
            </div>
          )}

          <div className="player-bar-info">
            <div className="player-bar-title truncate">{activeMedia.title}</div>
            <div className="player-bar-author truncate">
              {activeMedia.type === 'audio' ? '🎵 Audio' : '🎬 Video'} · {activeMedia.author || 'Unknown'}
            </div>
          </div>

          <div className="player-bar-controls">
            <button
              id="player-bar-play-toggle"
              className={`player-bar-btn ${isPlaying ? '' : 'play'}`}
              onClick={togglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              id="player-bar-close"
              className="player-bar-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Close Player"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* EXPANDED FULL PLAYER SHEET */}
      {isExpanded && (
        <div className="media-player-expanded">
          <div className="expanded-player-header">
            <button
              id="player-back-btn"
              className="btn btn-ghost"
              onClick={() => setIsExpanded(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>▼</span> Minimize
            </button>
            <span style={{ fontWeight: 600, color: 'var(--t2)', fontSize: 14 }}>Now Playing</span>
            <button
              id="player-expanded-close"
              className="btn btn-ghost"
              onClick={onClose}
            >
              ✕ Close
            </button>
          </div>

          <div className="expanded-player-body">
            {/* Visualizer Frame / Video Display */}
            <div className="player-art-container">
              {isVideo ? (
                // Video tag mirroring the hidden video's playback
                <video
                  className="player-video-tag"
                  src={getApiUrl(`/api/stream-file/${activeMedia.id}`)}
                  autoPlay={isPlaying}
                  controls
                  playsInline
                  style={{ width: '100%', height: '100%', borderRadius: 'var(--r-lg)' }}
                  onError={(e) => {
                    // Fallback to simple cover if video stream displays error
                    const target = e.target as HTMLVideoElement;
                    target.style.display = 'none';
                  }}
                />
              ) : activeMedia.thumb ? (
                <img
                  className={`player-art-audio ${isPlaying ? '' : 'player-art-paused'}`}
                  src={activeMedia.thumb}
                  alt=""
                  style={{ width: '180px', height: '180px', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=320'; }}
                />
              ) : (
                <div style={{ fontSize: 72 }}>🎵</div>
              )}
            </div>

            {/* Song Metadata */}
            <div className="player-expanded-meta">
              <h2 className="player-expanded-title truncate">{activeMedia.title}</h2>
              <p className="player-expanded-author">
                {activeMedia.author || 'Unknown Artist'}
              </p>
            </div>

            {/* Timeline slider */}
            <div className="player-scrubber">
              <div
                id="player-timeline"
                className="scrubber-slider-container"
                onClick={handleScrub}
                title="Seek position"
              >
                <div
                  className="scrubber-slider-progress"
                  style={{ width: `${progressPct}%` }}
                >
                  <div className="scrubber-slider-thumb" />
                </div>
              </div>
              <div className="player-time-row">
                <span>{formatSeconds(currentTime)}</span>
                <span>{formatSeconds(duration || 0)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="player-main-controls">
              <button
                id="player-backward-btn"
                className="player-btn-circle"
                onClick={(e) => skipTime(-10, e)}
                title="Rewind 10s"
              >
                ⏪
              </button>
              <button
                id="player-play-btn"
                className="player-btn-circle player-btn-circle-lg"
                onClick={togglePlay}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button
                id="player-forward-btn"
                className="player-btn-circle"
                onClick={(e) => skipTime(10, e)}
                title="Fast Forward 10s"
              >
                ⏩
              </button>
            </div>

            {/* Extra Controls */}
            <div className="player-extra-controls">
              {/* Loop Toggle */}
              <button
                id="player-loop-btn"
                className={`player-extra-btn ${isLooping ? 'active' : ''}`}
                onClick={toggleLoop}
                title="Toggle Loop"
              >
                🔄 {isLooping ? 'On' : 'Off'}
              </button>

              {/* Volume & Mute Controls */}
              <div className="volume-slider-container">
                <button
                  id="player-mute-btn"
                  className="player-extra-btn"
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
                <div
                  id="player-volume-slider"
                  className="volume-bar"
                  onClick={handleVolumeClick}
                  title="Adjust Volume"
                >
                  <div
                    className="volume-fill"
                    style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
