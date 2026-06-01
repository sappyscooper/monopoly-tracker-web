import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useActiveSeason } from '../hooks/useActiveSeason';
import { useGames } from '../hooks/useGames';
import { calculateGamePoints, formatPoints } from '../utils/scoring';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Sheet from '../components/Sheet';

function GameRow({ game, season }) {
  const [expanded, setExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteRevealed, setDeleteRevealed] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);

  const scores = calculateGamePoints(game.placements || []);
  const topPlayers = (game.placements || [])
    .filter(p => !p.isCameo)
    .sort((a, b) => a.placing - b.placing)
    .slice(0, 3)
    .map(p => p.player);

  const dateStr = game.date?.toDate ? game.date.toDate().toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short'
  }) : 'Unknown date';

  const handleDelete = async () => {
    await deleteDoc(doc(db, 'games', game.id));
    setDeleteConfirm(false);
    setDeleteRevealed(false);
  };

  const handleTouchMove = (event) => {
    if (touchStartX === null) return;
    const delta = event.touches[0].clientX - touchStartX;
    if (delta < -48) setDeleteRevealed(true);
    if (delta > 32) setDeleteRevealed(false);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <button
        className={`absolute bottom-0 right-0 top-0 z-0 w-24 bg-[#E07B6A] text-sm font-bold text-white transition-opacity ${deleteRevealed ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => setDeleteConfirm(true)}
        tabIndex={deleteRevealed ? 0 : -1}
      >
        Delete
      </button>
      <GlassCard className={`relative z-10 overflow-hidden transition-transform duration-200 ${deleteRevealed ? '-translate-x-24' : ''}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded(value => !value);
          }
        }}
        onTouchStart={event => setTouchStartX(event.touches[0].clientX)}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setTouchStartX(null)}
        className="w-full p-0 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-white">{dateStr}</p>
            <p className="text-sm text-[#8E8E93] truncate">
              {topPlayers.length ? topPlayers.map((p, i) => `${['🥇', '🥈', '🥉'][i] || ''} ${p}`).join('  ') : 'No placements'} · {(game.placements || []).length} players
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); setDeleteConfirm(true); }}
              className="icon-button !min-h-9 !min-w-9 rounded-xl bg-[#E07B6A]/15 text-[#E07B6A]" aria-label="Delete game"><Trash2 size={15} /></button>
            {expanded ? <ChevronUp size={18} className="text-[#8E8E93]" /> : <ChevronDown size={18} className="text-[#8E8E93]" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/8">
            <div className="p-4 space-y-2">
              {(game.placements || []).sort((a, b) => a.placing - b.placing).map(p => (
                <div key={p.player} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[#8E8E93] font-mono text-xs w-6">#{p.placing}</span>
                    <span className={`text-sm ${p.isCameo ? 'text-[#E8C96A]' : p.isAbsent ? 'text-[#8E8E93]' : 'text-white'}`}>
                      {p.player}
                    </span>
                    {p.isCameo && <span className="text-xs bg-[#E8C96A]/15 text-[#E8C96A] px-1.5 py-0.5 rounded">Guest</span>}
                    {p.isAbsent && <span className="text-xs bg-white/8 text-[#8E8E93] px-1.5 py-0.5 rounded">Absent</span>}
                  </div>
                  <span className="font-mono text-sm font-bold">
                    {p.isCameo ? '—' : `${formatPoints(scores[p.player] ?? 0)} pts`}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      </GlassCard>
      <Sheet open={deleteConfirm} title="Delete game?" subtitle="This removes the game from history and recalculates standings." onClose={() => setDeleteConfirm(false)}>
        <div className="space-y-3">
          <button onClick={handleDelete} className="destructive-button">Delete Game</button>
          <button onClick={() => setDeleteConfirm(false)} className="secondary-button">Cancel</button>
        </div>
      </Sheet>
    </div>
  );
}

export default function HistoryPage() {
  const { activeSeason: season } = useActiveSeason();
  const { games, loading } = useGames(season?.id);

  if (loading) return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="page-title">History</h1>
        </div>
      </header>
      <div className="page-inner flex min-h-[60dvh] items-center justify-center">
        <div className="secondary-text">Loading history…</div>
      </div>
    </div>
  );

  const grouped = {};
  (games || []).forEach(g => {
    const d = g.date?.toDate ? g.date.toDate() : new Date();
    const key = d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  });

  return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="page-title">History</h1>
        </div>
      </header>
      <div className="page-inner">
      {(games || []).length === 0 ? (
        <EmptyState icon="🕐" title="No games yet" message="Head to the Log tab to play your first game." />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, monthGames]) => (
            <div key={month}>
              <p className="section-label mb-3">{month}</p>
              <div className="space-y-2">
                {monthGames.map(g => <GameRow key={g.id} game={g} season={season} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
