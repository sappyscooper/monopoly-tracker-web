import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import SeasonsPage from './pages/SeasonsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import LogGamePage from './pages/LogGamePage';
import HistoryPage from './pages/HistoryPage';
import StatsPage from './pages/StatsPage';
import RulesPage from './pages/RulesPage';
import SitePasswordGate from './components/SitePasswordGate';

const IS_DEMO = import.meta.env.VITE_IS_DEMO === 'true';

export default function App() {
  return (
    <SitePasswordGate>
      {IS_DEMO && (
        <div style={{
          background: 'rgba(232, 201, 106, 0.12)',
          borderBottom: '1px solid rgba(232, 201, 106, 0.25)',
          padding: '9px 16px',
          textAlign: 'center',
          fontSize: 12,
          color: '#E8C96A',
          letterSpacing: '0.05em',
          fontWeight: 600,
          position: 'relative',
          zIndex: 100,
        }}>
          🎩 DEMO MODE — Sample data only.{' '}
          <a
            href="https://github.com/sappyscooper/monopoly-tracker-web"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#E8C96A', textDecoration: 'underline' }}
          >
            Deploy your own →
          </a>
        </div>
      )}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/leaderboard" replace />} />
            <Route path="seasons" element={<SeasonsPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="log" element={<LogGamePage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="rules" element={<RulesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SitePasswordGate>
  );
}
