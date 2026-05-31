import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveSeason } from '../hooks/useActiveSeason';
import { useGames } from '../hooks/useGames';
import { seasonLeaderboard, formatPoints } from '../utils/scoring';
import GlassCard from '../components/GlassCard';
import StatusPill from '../components/StatusPill';
import EmptyState from '../components/EmptyState';

const RANK_COLORS = {
  1: '#E8C96A',
  2: '#6EB5D4',
  3: '#d4a760',
};

export default function LeaderboardPage() {
  const { activeSeason: season } = useActiveSeason();
  const { games } = useGames(season?.id);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);

  if (!season) return (
    <div className="px-4 pt-14">
      <EmptyState icon="📋" title="No season yet" message="Create a season in the Seasons tab to get started." />
    </div>
  );

  const leaderboard = season ? seasonLeaderboard(games, season.regularPlayers || [], season.cameoWeight ?? 0.5) : [];
  const champion = leaderboard[0];
  const loser = leaderboard[leaderboard.length - 1];
  const showCelebration = !season.isActive && !celebrationDismissed && games.length > 0;

  return (
    <div className="px-4 pt-14 pb-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold leading-tight">{season.name}</h1>
          <p className="text-sm text-[#8E8E93] mt-0.5">{games.length} games played</p>
        </div>
        <StatusPill active={season.isActive} />
      </div>

      {games.length === 0 ? (
        <EmptyState icon="🎲" title="No games yet" message="Head to Log Game to play your first game." />
      ) : (
        <div className="space-y-4">
          {champion && loser && champion.player !== loser.player && (
            <div className="grid grid-cols-2 gap-3">
              <GlassCard tint="gold" className="p-4">
                <p className="text-xs text-[#8E8E93] mb-1">🏆 Champion</p>
                <p className="font-bold text-lg text-[#E8C96A]">{champion.player}</p>
                <p className="text-2xl font-mono font-bold">{formatPoints(champion.points)}</p>
                <p className="text-xs text-[#8E8E93]">points</p>
              </GlassCard>
              <GlassCard tint="rose" className="p-4">
                <p className="text-xs text-[#8E8E93] mb-1">💀 Last Place</p>
                <p className="font-bold text-lg text-[#E07B6A]">{loser.player}</p>
                <p className="text-2xl font-mono font-bold">{formatPoints(loser.points)}</p>
                <p className="text-xs text-[#8E8E93]">points</p>
              </GlassCard>
            </div>
          )}

          <div className="space-y-2">
            {leaderboard.map((row, i) => {
              const gamesPlayed = games.filter(g => g.placements?.some(p => p.player === row.player && !p.isCameo)).length;
              const avg = gamesPlayed > 0 ? row.points / gamesPlayed : 0;
              const isLast = i === leaderboard.length - 1;
              return (
                <motion.div key={row.player} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}>
                  <GlassCard tint={isLast ? 'rose' : i === 0 ? 'gold' : undefined} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{ background: RANK_COLORS[i+1] ? `${RANK_COLORS[i+1]}22` : '#ffffff10',
                                 color: RANK_COLORS[i+1] || (isLast ? '#E07B6A' : '#8E8E93'),
                                 border: `1px solid ${RANK_COLORS[i+1] || (isLast ? '#E07B6A' : '#ffffff20')}44` }}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{row.player}</p>
                        <p className="text-xs text-[#8E8E93]">{gamesPlayed} games · {formatPoints(avg)} avg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-mono font-bold">{formatPoints(row.points)}</p>
                        {isLast && <p className="text-xs text-[#E07B6A]">💀 Dare incoming</p>}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showCelebration && (
          <motion.div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]/95"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center p-8">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-black mb-2">SEASON ENDED</h2>
              {champion && <p className="text-2xl font-bold text-[#E8C96A] mb-1">{champion.player} wins!</p>}
              {loser && <p className="text-[#E07B6A] mb-8">{loser.player} owes a dare 💀</p>}
              <button onClick={() => setCelebrationDismissed(true)}
                className="px-8 py-3 rounded-2xl bg-[#E8C96A] text-black font-bold">
                Back to Standings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
