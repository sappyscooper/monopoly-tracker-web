import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveSeason } from '../hooks/useActiveSeason';
import { useGames } from '../hooks/useGames';
import { calculateGamePoints, seasonLeaderboard, formatPoints } from '../utils/scoring';
import GlassCard from '../components/GlassCard';
import StatusPill from '../components/StatusPill';
import EmptyState from '../components/EmptyState';

const RANK_COLORS = {
  1: '#E8C96A',
  2: '#6EB5D4',
  3: '#d4a760',
};

function MiniSparkline({ values, color = '#E8C96A' }) {
  const safeValues = values && values.length ? values : [0, 0];
  const max = Math.max(...safeValues, 1);
  const min = Math.min(...safeValues, 0);
  const range = Math.max(max - min, 1);
  const points = safeValues.map((value, index) => {
    const x = safeValues.length === 1 ? 30 : (index / (safeValues.length - 1)) * 60;
    const y = 24 - ((value - min) / range) * 20 - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="64" height="28" viewBox="0 0 64 28" aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      <circle cx={points.split(' ').at(-1)?.split(',')[0] || 60} cy={points.split(' ').at(-1)?.split(',')[1] || 14} r="2.4" fill={color} />
    </svg>
  );
}

function CelebrationOverlay({ champion, loser, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[1200] grid place-items-center bg-[#050507]/95 px-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 100 }).map((_, index) => (
          <span
            key={index}
            className="absolute h-2 w-1 rounded-full"
            style={{
              left: `${(index * 37) % 100}%`,
              top: `-${(index % 20) * 8}px`,
              background: ['#E8C96A', '#6EB5D4', '#E07B6A', '#ffffff'][index % 4],
              animation: `fall ${3.2 + (index % 7) * 0.22}s linear infinite`,
              animationDelay: `${(index % 18) * 0.09}s`,
              opacity: 0.85,
            }}
          />
        ))}
      </div>
      <motion.div
        className="card relative z-10 max-w-sm text-center"
        initial={{ y: 24, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        onClick={event => event.stopPropagation()}
      >
        <p className="mb-3 text-6xl">🏆</p>
        <p className="section-label mb-3">Season Over</p>
        <h2 className="mb-2 text-3xl font-black text-[#E8C96A]">Champion: {champion?.player || '—'}</h2>
        <p className="mb-6 text-2xl font-bold text-[#E07B6A]">💀 Loser: {loser?.player || '—'} — Dare time!</p>
        <button className="primary-button" onClick={onClose}>Back to Standings</button>
      </motion.div>
    </motion.div>,
    document.body
  );
}

export default function LeaderboardPage() {
  const { activeSeason: season, loading: seasonsLoading } = useActiveSeason();
  const { games, loading: gamesLoading } = useGames(season?.id);
  const [celebrationDismissed, setCelebrationDismissed] = useState(false);

  const loading = seasonsLoading || gamesLoading;

  if (loading) return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="page-title">Leaderboard</h1>
        </div>
      </header>
      <div className="page-inner flex min-h-[60dvh] items-center justify-center">
        <div className="secondary-text">Loading standings…</div>
      </div>
    </div>
  );

  if (!season) return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="page-title">Leaderboard</h1>
        </div>
      </header>
      <div className="page-inner">
      <EmptyState icon="📋" title="No season yet" message="Create a season in the Seasons tab to get started." />
      </div>
    </div>
  );

  const safeGames = games || [];
  const leaderboard = season ? seasonLeaderboard(safeGames, season.regularPlayers || []) : [];
  const champion = leaderboard[0];
  const loser = leaderboard[leaderboard.length - 1];
  const showCelebration = !season.isActive && !celebrationDismissed && safeGames.length > 0;

  return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="page-title truncate">{season.name}</h1>
              <StatusPill active={season.isActive} />
            </div>
            <p className="secondary-text mt-1">{safeGames.length} games played {!season.isActive && <span className="text-[#E8C96A]"> · 🎉 Season Over</span>}</p>
          </div>
        </div>
      </header>

      <div className="page-inner">
      {safeGames.length === 0 ? (
        <EmptyState icon="🎲" title="No games yet" message="Head to Log Game to play your first game." />
      ) : (
        <div className="space-y-4">
          {champion && loser && champion.player !== loser.player && (
            <div className="grid grid-cols-2 gap-3">
              <GlassCard tint="gold">
                <p className="text-xs text-[#8E8E93] mb-1">🏆 Champion</p>
                <p className="font-bold text-lg text-[#E8C96A]">{champion.player}</p>
                <p className="text-2xl font-mono font-bold">{formatPoints(champion.points)}</p>
                <p className="text-xs text-[#8E8E93]">points</p>
              </GlassCard>
              <GlassCard tint="rose">
                <p className="text-xs text-[#8E8E93] mb-1">💀 Last Place</p>
                <p className="font-bold text-lg text-[#E07B6A]">{loser.player}</p>
                <p className="text-2xl font-mono font-bold">{formatPoints(loser.points)}</p>
                <p className="text-xs text-[#8E8E93]">Dare incoming</p>
              </GlassCard>
            </div>
          )}

          <div className="space-y-2">
            {leaderboard.map((row, i) => {
              const gamesPlayed = safeGames.filter(g => (g.placements || []).some(p => p.player === row.player && !p.isCameo)).length;
              const avg = gamesPlayed > 0 ? row.points / gamesPlayed : 0;
              const isLast = i === leaderboard.length - 1;
              const recent = [...safeGames]
                .sort((a, b) => (a.date?.seconds || 0) - (b.date?.seconds || 0))
                .slice(-5)
                .map(game => calculateGamePoints(game.placements || [])[row.player] || 0);
              return (
                <motion.div key={row.player} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}>
                  <GlassCard tint={isLast ? 'rose' : i === 0 ? 'gold' : undefined}>
                    <div className="flex items-center gap-3">
                      <div className="number-text w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{ background: RANK_COLORS[i+1] ? `${RANK_COLORS[i+1]}22` : '#ffffff10',
                                 color: RANK_COLORS[i+1] || (isLast ? '#E07B6A' : '#8E8E93'),
                                 border: `1px solid ${RANK_COLORS[i+1] || (isLast ? '#E07B6A' : '#ffffff20')}44` }}>
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white">{row.player}</p>
                        <p className="text-xs text-[#8E8E93]">{gamesPlayed} games · {formatPoints(avg)} avg</p>
                      </div>
                      <MiniSparkline values={recent} color={RANK_COLORS[i+1] || (isLast ? '#E07B6A' : '#6EB5D4')} />
                      <div className="text-right min-w-[70px]">
                        <p className="text-2xl font-mono font-bold">{formatPoints(row.points)}</p>
                        <p className="text-xs text-[#8E8E93]">pts</p>
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
          <CelebrationOverlay champion={champion} loser={loser} onClose={() => setCelebrationDismissed(true)} />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
