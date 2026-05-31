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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-white/8"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-around max-w-lg mx-auto pt-2">
        {tabs.map(({ to, icon: Icon, label, center }) => (
          <NavLink key={to} to={to}
            aria-label={label}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center
              ${center ? '-mt-3' : ''}
              ${isActive ? 'text-[#E8C96A]' : 'text-[#8E8E93]'}`
            }>
            {center ? (
              <>
                <div className="bg-[#E8C96A] rounded-full p-2.5 shadow-lg shadow-[#E8C96A]/30">
                  <Icon size={22} className="text-black" />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </>
            ) : (
              <>
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
