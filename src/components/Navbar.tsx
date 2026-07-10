interface Props {
  tab: 'home' | 'queue' | 'history' | 'more';
  setTab: (tab: 'home' | 'queue' | 'history' | 'more') => void;
  activeCount: number;
}

export default function Navbar({ tab, setTab, activeCount }: Props) {
  return (
    <nav className="navbar">
      <div className="nav-items">
        <button
          id="nav-home"
          className={`nav-item${tab === 'home' ? ' active' : ''}`}
          onClick={() => setTab('home')}
        >
          <div className="nav-item-icon">🏠</div>
          <span className="nav-label">Home</span>
        </button>

        <button
          id="nav-queue"
          className={`nav-item${tab === 'queue' ? ' active' : ''}`}
          onClick={() => setTab('queue')}
        >
          <div className="nav-item-icon">
            📥
            {activeCount > 0 && <span className="nav-badge">{activeCount}</span>}
          </div>
          <span className="nav-label">Queue</span>
        </button>

        <button
          id="nav-history"
          className={`nav-item${tab === 'history' ? ' active' : ''}`}
          onClick={() => setTab('history')}
        >
          <div className="nav-item-icon">📜</div>
          <span className="nav-label">History</span>
        </button>

        <button
          id="nav-more"
          className={`nav-item${tab === 'more' ? ' active' : ''}`}
          onClick={() => setTab('more')}
        >
          <div className="nav-item-icon">⚙️</div>
          <span className="nav-label">More</span>
        </button>
      </div>
    </nav>
  );
}
