type Tab = 'home' | 'queue' | 'history' | 'more';

interface NavItem {
  id: Tab;
  label: string;
  icon: string;
  activeIcon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',    label: 'Home',    icon: '⌂',   activeIcon: '⌂'   },
  { id: 'queue',   label: 'Queue',   icon: '↓',   activeIcon: '↓'   },
  { id: 'history', label: 'History', icon: '◷',   activeIcon: '◷'   },
  { id: 'more',    label: 'More',    icon: '⋯',   activeIcon: '⋯'   },
];

interface Props {
  tab: Tab;
  setTab: (t: Tab) => void;
  activeCount: number;
}

export default function Navbar({ tab, setTab, activeCount }: Props) {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="nav-items">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            className={`nav-item${tab === item.id ? ' active' : ''}`}
            onClick={() => setTab(item.id)}
            aria-label={item.label}
            aria-current={tab === item.id ? 'page' : undefined}
          >
            <span className="nav-item-icon">
              {tab === item.id ? item.activeIcon : item.icon}
              {item.id === 'queue' && activeCount > 0 && (
                <span className="nav-badge">{activeCount > 9 ? '9+' : activeCount}</span>
              )}
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
