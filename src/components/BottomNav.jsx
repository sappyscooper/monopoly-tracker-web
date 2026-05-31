import { NavLink } from 'react-router-dom';
import { Trophy, List, PlusCircle, Clock, BarChart2 } from 'lucide-react';

const tabs = [
  { to: '/seasons', icon: Trophy, label: 'Seasons' },
  { to: '/leaderboard', icon: List, label: 'Leaderboard' },
  { to: '/log', icon: PlusCircle, label: 'Log', center: true },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/stats', icon: BarChart2, label: 'Stats' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-grid">
        {tabs.map(({ to, icon: Icon, label, center }) => (
          <NavLink key={to} to={to}
            aria-label={label}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }>
            {center ? (
              <>
                <div className="nav-primary">
                  <Icon size={22} />
                </div>
                <span>{label}</span>
              </>
            ) : (
              <>
                <Icon size={20} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
