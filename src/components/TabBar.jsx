const TABS = [
  { id: 'dashboard', icon: '📚', label: 'APRENDER' },
  { id: 'companion', icon: '🐶', label: 'KUMA' },
  { id: 'profile', icon: '👤', label: 'PERFIL' },
]

export default function TabBar({ active, onNavigate }) {
  return (
    <nav className="tabbar">
      <div className="tabbar-inner">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tabbar-item${active === tab.id ? ' active' : ''}`}
            onClick={() => onNavigate(tab.id)}
          >
            <span className="tabbar-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
