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

function GameRow({ game, season }) {
  const [expanded, setExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const scores = calculateGamePoints(game.placements || [], season?.cameoWeight ?? 0.5);
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
  };

  return (
    <GlassCard className="overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left"
        style={{ WebkitTapHighlightColor: 'transparent' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-white">{dateStr}</p>
            <p className="text-sm text-[#8E8E93]">{topPlayers.join(' · ')} · {game.placements?.length || 0} players</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); setDeleteConfirm(true); }}
              className="p-2 rounded-lg bg-[#E07B6A]/15 text-[#E07B6A]"><Trash2 size={15} /></button>
            {expanded ? <ChevronUp size={18} className="text-[#8E8E93]" /> : <ChevronDown size={18} className="text-[#8E8E93]" />}
          </div>
        </div>
      </button>

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
                    {p.isCameo && <span className="text-[10px] bg-[#E8C96A]/15 text-[#E8C96A] px-1.5 py-0.5 rounded">Guest</span>}
                    {p.isAbsent && <span className="text-[10px] bg-white/8 text-[#8E8E93] px-1.5 py-0.5 rounded">Absent</span>}
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

      {deleteConfirm && (
        <div className="border-t border-white/8 p-4 bg-[#E07B6A]/8">
          <p className="text-sm text-white mb-3">Delete this game?</p>
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2 rounded-xl bg-white/8 text-sm">Cancel</button>
            <button onClick={handleDelete} className="flex-1 py-2 rounded-xl bg-[#E07B6A] text-white font-bold text-sm">Delete</button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

export default function HistoryPage() {
  const { activeSeason: season } = useActiveSeason();
  const { games, loading } = useGames(season?.id);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-[#8E8E93]">Loading…</div></div>;

  const grouped = {};
  games.forEach(g => {
    const d = g.date?.toDate ? g.date.toDate() : new Date();
    const key = d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  });

  return (
    <div className="px-4 pt-14 pb-4">
      <h1 className="text-2xl font-bold mb-6">History</h1>
      {games.length === 0 ? (
        <EmptyState icon="🕐" title="No games yet" message="Log your first game to see history here." />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, monthGames]) => (
            <div key={month}>
              <p className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider mb-3">{month}</p>
              <div className="space-y-2">
                {monthGames.map(g => <GameRow key={g.id} game={g} season={season} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
