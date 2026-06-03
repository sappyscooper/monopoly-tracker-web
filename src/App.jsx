import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import SeasonsPage from './pages/SeasonsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import LogGamePage from './pages/LogGamePage';
import HistoryPage from './pages/HistoryPage';
import StatsPage from './pages/StatsPage';
import RulesPage from './pages/RulesPage';
import SitePasswordGate from './components/SitePasswordGate';

export default function App() {
  return (
    <SitePasswordGate>
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
