import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout() {
  return (
    <div className="min-h-dvh bg-[#0a0a0f]">
      <main className="pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
