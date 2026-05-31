import { Outlet } from 'react-router-dom';
import BibleFAB from './BibleFAB';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
      <BibleFAB />
    </div>
  );
}
