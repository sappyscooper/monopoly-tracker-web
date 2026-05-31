import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useActiveSeason } from '../hooks/useActiveSeason';
import { useGames } from '../hooks/useGames';
import { calculateGamePoints, seasonLeaderboard, formatPoints } from '../utils/scoring';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';

const ACCENTS = ['#E8C96A', '#6EB5D4', '#E07B6A', '#d4a760', '#8EB5D4'];

function InfoModal({ title, explanation, onClose }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div className="relative bg-[#1c1c22] rounded-3xl p-6 w-full max-w-lg"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-[#8E8E93] uppercase tracking-wider mb-1">About This Stat</p>
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/8 mt-1"><X size={16} /></button>
        </div>
        <p className="text-[#8E8E93] leading-relaxed">{explanation}</p>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ title, explanation, children }) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <>
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider">{title}</h3>
          <button onClick={() => setShowInfo(true)} className="p-1.5 rounded-lg bg-white/5 text-[#8E8E93]">
            <Info size={14} />
          </button>
        </div>
        {children}
      </GlassCard>
      <AnimatePresence>
        {showInfo && <InfoModal title={title} explanation={explanation} onClose={() => setShowInfo(false)} />}
      </AnimatePresence>
    </>
  );
}

function computeStats(season, games) {
  if (!season || !games.length) return null;
  const players = season.regularPlayers || [];
  const cameoWeight = season.cameoWeight ?? 0.5;

  const leaderboard = seasonLeaderboard(games, players, cameoWeight);
  const totalGames = games.length;

  const now = new Date();
  const endDate = season.endDate?.toDate ? season.endDate.toDate() : new Date(season.endDate);
  const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
  const remainingGames = Math.max(0, Math.ceil(daysLeft / 7));

  const gamesPlayedByPlayer = {};
  players.forEach(p => gamesPlayedByPlayer[p] = 0);
  games.forEach(g => {
    g.placements?.forEach(p => {
      if (!p.isCameo && gamesPlayedByPlayer[p.player] !== undefined) gamesPlayedByPlayer[p.player]++;
    });
  });

  const leaderboardWithAvg = leaderboard.map((row, i) => {
    const gp = gamesPlayedByPlayer[row.player] || 0;
    const avg = gp > 0 ? row.points / gp : 0;
    const recentGames = [...games].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)).slice(0, 5);
    const sparkline = recentGames.reverse().map(g => {
      const pts = calculateGamePoints(g.placements || [], cameoWeight);
      return pts[row.player] ?? 0;
    });
    return { ...row, gamesPlayed: gp, avg, sparkline, accent: ACCENTS[i % ACCENTS.length] };
  });

  // Biggest rivalry
  let rivalry = { pair: '—', gap: Infinity };
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const diffs = games.flatMap(g => {
        const pA = g.placements?.find(p => p.player === players[i] && !p.isCameo);
        const pB = g.placements?.find(p => p.player === players[j] && !p.isCameo);
        if (!pA || !pB) return [];
        return [Math.abs(pA.placing - pB.placing)];
      });
      if (!diffs.length) continue;
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      if (avg < rivalry.gap) rivalry = { pair: `${players[i]} vs ${players[j]}`, gap: avg };
    }
  }
  if (rivalry.gap === Infinity) rivalry = { pair: '—', gap: 0 };

  // Podium counts
  const podiumCounts = {};
  players.forEach(p => podiumCounts[p] = { first: 0, second: 0, third: 0, last: 0 });
  games.forEach(g => {
    const regulars = (g.placements || []).filter(p => !p.isCameo).sort((a, b) => a.placing - b.placing);
    const lastPlacing = regulars[regulars.length - 1]?.placing;
    regulars.forEach(p => {
      if (!podiumCounts[p.player]) return;
      if (p.placing === 1) podiumCounts[p.player].first++;
      if (p.placing === 2) podiumCounts[p.player].second++;
      if (p.placing === 3) podiumCounts[p.player].third++;
      if (p.placing === lastPlacing) podiumCounts[p.player].last++;
    });
  });

  const mostFirsts = players.reduce((best, p) => (!best || podiumCounts[p].first > podiumCounts[best].first) ? p : best, null);
  const mostLasts = players.reduce((best, p) => (!best || podiumCounts[p].last > podiumCounts[best].last) ? p : best, null);

  // Head to head
  const headToHead = {};
  players.forEach(row => {
    headToHead[row] = {};
    players.forEach(col => {
      if (row === col) { headToHead[row][col] = null; return; }
      const vals = games.flatMap(g => {
        const rP = g.placements?.find(p => p.player === row && !p.isCameo);
        const cP = g.placements?.find(p => p.player === col && !p.isCameo);
        if (!rP || !cP) return [];
        return [rP.placing];
      });
      headToHead[row][col] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
  });

  // Cameo stats
  const cameoPlacements = games.flatMap(g => (g.placements || []).filter(p => p.isCameo));
  const cameoByPlayer = {};
  cameoPlacements.forEach(p => {
    if (!cameoByPlayer[p.player]) cameoByPlayer[p.player] = [];
    cameoByPlayer[p.player].push(p.placing);
  });
  const cameoRows = Object.entries(cameoByPlayer).map(([name, placings]) => ({
    name, games: placings.length, avgPlacing: placings.reduce((a, b) => a + b, 0) / placings.length
  })).sort((a, b) => b.games - a.games);

  const cameoGames = games.filter(g => g.placements?.some(p => p.isCameo));
  const regularGames = games.filter(g => !g.placements?.some(p => p.isCameo));
  const avgScore = (gs) => {
    const scores = gs.flatMap(g => Object.values(calculateGamePoints(g.placements || [], cameoWeight)));
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  };
  const cameoDelta = avgScore(cameoGames) - avgScore(regularGames);

  // Recent form
  const recentForm = {};
  const streaks = {};
  players.forEach(p => {
    const recents = [...games].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0))
      .slice(0, 5).map(g => g.placements?.find(pl => pl.player === p && !pl.isCameo)?.placing ?? null);
    recentForm[p] = [...recents].reverse();

    let hotCount = 0;
    for (const placing of recents) {
      if (placing === null) break;
      if (placing <= 2) hotCount++;
      else break;
    }
    streaks[p] = hotCount >= 2 ? { type: 'hot', count: hotCount } : { type: null };
  });

  // Projection
  const totalEstimated = totalGames + remainingGames;
  const projectedPoints = {};
  leaderboardWithAvg.forEach(row => {
    projectedPoints[row.player] = { current: row.points, projected: row.avg * totalEstimated, accent: row.accent };
  });
  const projSorted = Object.entries(projectedPoints).sort((a, b) => b[1].projected - a[1].projected);
  const forecastHeadline = totalGames < 2 ? 'Ask again after a few more games'
    : projSorted.length >= 2 && projSorted[0][1].projected - projSorted[1][1].projected > 5
      ? `${projSorted[0][0]} is on track to win 🏆`
      : "It's too close to call 👀";

  const dominant = leaderboardWithAvg[0];

  return {
    totalGames, remainingGames, leaderboard: leaderboardWithAvg,
    mostDominantPlayer: dominant?.player || '—', mostDominantAvg: dominant?.avg || 0,
    biggestRivalry: rivalry.pair, biggestRivalryGap: rivalry.gap,
    podiumCounts, mostFirsts, mostLasts,
    headToHead, players,
    totalCameoAppearances: cameoPlacements.length, cameoRows, cameoDelta,
    recentForm, streaks,
    projectedPoints, forecastHeadline,
  };
}

export default function StatsPage() {
  const { activeSeason: season } = useActiveSeason();
  const { games } = useGames(season?.id);
  const stats = useMemo(() => computeStats(season, games), [season, games]);

  if (!season) return (
    <div className="px-4 pt-14">
      <EmptyState icon="📊" title="No active season" message="Start a season to see your stats unfold." />
    </div>
  );
  if (!stats) return (
    <div className="px-4 pt-14">
      <h1 className="text-2xl font-bold mb-2">Season Stats</h1>
      <p className="text-[#8E8E93] text-sm">{season.name}</p>
      <div className="mt-8"><EmptyState icon="🎲" title="No games yet" message="Log your first game to see stats." /></div>
    </div>
  );

  const { leaderboard, players, headToHead, recentForm, streaks, projectedPoints, cameoRows } = stats;

  return (
    <div className="px-4 pt-14 pb-6 space-y-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold">Season Stats</h1>
        <p className="text-sm text-[#8E8E93]">{season.name}</p>
      </div>

      {/* Card 1: Season at a Glance */}
      <StatCard title="Season at a Glance" explanation="A quick overview of where your season stands. Total Games counts every game logged. Est. Remaining is a rough projection based on end date. Highest Avg shows who earns the most points per game. Closest Rivals names the two players with the smallest average placing gap.">
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: stats.totalGames, sub: 'games played so far' },
            { value: stats.remainingGames, sub: 'games left this season' },
            { value: stats.mostDominantPlayer, sub: `${formatPoints(stats.mostDominantAvg)} pts/game avg`, extra: 'highest avg pts/game' },
            { value: stats.biggestRivalry, sub: 'most evenly matched', extra: `avg ${stats.biggestRivalryGap.toFixed(1)} placing gap` },
          ].map((tile, i) => (
            <div key={i} className="bg-[#26262e] rounded-xl p-3">
              <p className="font-bold text-white text-base leading-tight truncate">{tile.value}</p>
              <p className="text-xs text-[#8E8E93] mt-1">{tile.sub}</p>
              {tile.extra && <p className="text-[10px] text-[#8E8E93] italic mt-0.5">{tile.extra}</p>}
            </div>
          ))}
        </div>
      </StatCard>

      {/* Card 2: Who's Winning Right Now */}
      <StatCard title="Who's Winning Right Now" explanation="Your current standings with sparklines showing each player's last 5 games. Trend badges show recent momentum.">
        <div className="space-y-3">
          {leaderboard.map((row, i) => {
            const vals = row.sparkline;
            const recent2 = vals.length >= 2 ? (vals.slice(-2).reduce((a, b) => a + b, 0) / 2) : 0;
            const before2 = vals.length >= 4 ? (vals.slice(-4, -2).reduce((a, b) => a + b, 0) / 2) : null;
            let badge = null;
            if (before2 !== null && vals.length >= 3) {
              if (recent2 > before2 + 0.5) badge = { label: '↑ Hot', color: '#6EB5D4', bg: '#6EB5D433' };
              else if (recent2 < before2 - 0.5) badge = { label: '↓ Cold', color: '#E07B6A', bg: '#E07B6A33' };
              else badge = { label: '→ Stable', color: '#8E8E93', bg: '#8E8E9333' };
            }
            return (
              <div key={row.player} className="flex items-center gap-2">
                <span className="w-5 text-xs font-bold font-mono" style={{ color: ACCENTS[i] }}>{i + 1}</span>
                <span className="flex-1 text-sm font-semibold truncate">{row.player}</span>
                <div className="w-16 h-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={row.sparkline.map((v, j) => ({ v, j }))}>
                      <Line type="monotone" dataKey="v" stroke={row.accent} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {badge && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>
                )}
                <span className="font-mono font-bold text-sm w-10 text-right">{formatPoints(row.points)}</span>
              </div>
            );
          })}
          {leaderboard.length >= 2 && (
            <p className="text-xs text-[#8E8E93] pt-1 border-t border-white/8">
              {leaderboard[0].points - leaderboard[1].points < 3
                ? `${leaderboard[0].player} and ${leaderboard[1].player} are neck and neck`
                : `${leaderboard[0].player} leads with ${formatPoints(leaderboard[0].points)} pts`}
            </p>
          )}
        </div>
      </StatCard>

      {/* Card 3: Consistency Score */}
      <StatCard title="Consistency Score" explanation="The average number of points each player earns per game played. Higher is better — this shows who consistently performs well, not just who's played the most games.">
        <p className="text-xs text-[#8E8E93] mb-3">higher = more points every game, not just sometimes</p>
        <div className="space-y-2">
          {[...leaderboard].sort((a, b) => b.avg - a.avg).map((row, i, arr) => (
            <div key={row.player} className="flex items-center gap-2">
              <span className="text-sm font-semibold w-16 truncate">{row.player}</span>
              <div className="flex-1 bg-[#26262e] rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(row.avg / (arr[0]?.avg || 1)) * 100}%`, background: row.accent }} />
              </div>
              <span className="text-xs font-mono text-[#8E8E93] w-16 text-right">
                {formatPoints(row.avg)} avg {i === 0 ? '👑' : i === arr.length - 1 ? '👻' : ''}
              </span>
            </div>
          ))}
        </div>
      </StatCard>

      {/* Card 4: Podium Record */}
      <StatCard title="Podium Record" explanation="How many times each player has finished in the top 3. Gold = 1st, Silver = 2nd, Bronze = 3rd. The trophy goes to whoever has the most 1st places, the skull to whoever finishes last the most.">
        <p className="text-xs text-[#8E8E93] mb-3">how often each player reaches the top 3</p>
        <div className="space-y-2 mb-4">
          {players.map(p => (
            <div key={p} className="flex items-center gap-2">
              <span className="text-sm font-semibold flex-1">{p}</span>
              {[
                { n: stats.podiumCounts[p]?.first || 0, color: '#E8C96A', label: '🥇' },
                { n: stats.podiumCounts[p]?.second || 0, color: '#6EB5D4', label: '🥈' },
                { n: stats.podiumCounts[p]?.third || 0, color: '#d4a760', label: '🥉' },
              ].map(({ n, color, label }) => (
                <span key={label} className="text-xs font-mono font-bold px-2 py-1 rounded-lg"
                  style={{ background: `${color}22`, color: n > 0 ? color : '#8E8E93' }}>
                  {label} {n}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-white/8 pt-4">
          <div className="bg-[#E8C96A]/8 rounded-xl p-3">
            <p className="text-xs text-[#8E8E93] mb-1">Winning Machine 🏆</p>
            <p className="font-bold text-[#E8C96A]">{stats.mostFirsts || '—'}</p>
            <p className="text-xs text-[#8E8E93]">x{stats.podiumCounts[stats.mostFirsts]?.first || 0} wins</p>
          </div>
          <div className="bg-[#E07B6A]/8 rounded-xl p-3">
            <p className="text-xs text-[#8E8E93] mb-1">Perma-Loser 💀</p>
            <p className="font-bold text-[#E07B6A]">{stats.mostLasts || '—'}</p>
            <p className="text-xs text-[#8E8E93]">x{stats.podiumCounts[stats.mostLasts]?.last || 0} lasts</p>
          </div>
        </div>
      </StatCard>

      {/* Card 5: Who Beats Who */}
      <StatCard title="Who Beats Who" explanation="Your average finishing position in games where each opponent was also playing. Lower numbers are better — a 1.5 means you tend to finish near the top when that person is around.">
        <p className="text-xs text-[#8E8E93] mb-2">lower number = you finish ahead of them</p>
        <div className="flex gap-3 mb-3 text-xs">
          {[
            { color: '#6EB5D433', border: '#6EB5D4', label: 'You beat them' },
            { color: '#E07B6A33', border: '#E07B6A', label: 'They beat you' },
            { color: '#ffffff15', border: '#ffffff30', label: 'Even' },
          ].map(({ color, border, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: color, border: `1px solid ${border}` }} />
              <span className="text-[#8E8E93]">{label}</span>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="w-10" />
                {players.map(p => <th key={p} className="w-9 text-center text-[#8E8E93] font-medium pb-1">{p.slice(0,4)}</th>)}
              </tr>
            </thead>
            <tbody>
              {players.map(row => (
                <tr key={row}>
                  <td className="text-[#8E8E93] font-medium pr-2 py-0.5">{row.slice(0,4)}</td>
                  {players.map(col => {
                    const val = headToHead[row]?.[col];
                    const bg = val === null ? 'transparent'
                      : val < 2.5 ? '#6EB5D433'
                      : val > 3.5 ? '#E07B6A33' : '#ffffff10';
                    return (
                      <td key={col} className="w-9 h-9 text-center rounded font-mono" style={{ background: bg }}>
                        {val !== null ? val.toFixed(1) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StatCard>

      {/* Card 6: Cameo Effect */}
      {stats.totalCameoAppearances > 0 && (
        <StatCard title="Cameo Effect" explanation="Tracks guest players who joined without being in the regular season. The delta shows whether cameo games result in higher or lower average points for regular players vs games without guests.">
          <div className="rounded-xl p-3 mb-4"
            style={{ background: Math.abs(stats.cameoDelta) < 0.3 ? '#ffffff10'
              : stats.cameoDelta > 0 ? '#6EB5D433' : '#E07B6A33' }}>
            <p className="font-bold text-base">
              {Math.abs(stats.cameoDelta) < 0.3 ? 'Cameos are neutral'
                : stats.cameoDelta > 0 ? `Cameos help! +${formatPoints(stats.cameoDelta)} pts avg`
                : `Cameos hurt. ${formatPoints(stats.cameoDelta)} pts avg`}
            </p>
            <p className="text-xs text-[#8E8E93] mt-0.5">vs. games without guests</p>
          </div>
          <div className="space-y-2">
            {cameoRows.map(c => (
              <div key={c.name} className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#E8C96A]">{c.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8E8E93]">{c.games} games</span>
                  <span className="font-mono text-xs bg-[#E8C96A]/15 text-[#E8C96A] px-2 py-0.5 rounded-full">
                    avg {c.avgPlacing.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </StatCard>
      )}

      {/* Card 7: Recent Form */}
      <StatCard title="Recent Form" explanation="Your last 5 games at a glance. Gold = 1st, silver = 2nd, bronze = 3rd, dark = lower. Empty circles = game not played yet. Left to right: oldest to newest.">
        <div className="space-y-3">
          {players.map(p => {
            const streak = streaks[p];
            const placings = recentForm[p] || [];
            return (
              <div key={p} className="flex items-center gap-2">
                <span className="text-sm font-semibold flex-1 truncate">{p}</span>
                {streak?.type === 'hot' && (
                  <span className="text-[10px] font-semibold text-[#E8C96A]">🔥 {streak.count}-game streak</span>
                )}
                <div className="flex gap-1">
                  {Array(5).fill(null).map((_, i) => {
                    const placing = placings[i];
                    const bg = placing === null || placing === undefined ? '#ffffff10'
                      : placing === 1 ? '#E8C96A'
                      : placing === 2 ? '#6EB5D4'
                      : placing === 3 ? '#d4a760'
                      : '#32323c';
                    return (
                      <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold font-mono"
                        style={{ background: bg, color: placing === 1 ? '#000' : '#fff' }}>
                        {placing !== null && placing !== undefined && placing > 3 ? placing : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </StatCard>

      {/* Card 8: End of Season Forecast */}
      <StatCard title="End of Season Forecast" explanation="A rough forecast of where everyone will finish if current scoring rates continue. Takes each player's average points per game and multiplies by estimated total games. For fun — one bad game can change everything.">
        <div className="rounded-xl p-3 bg-white/5 mb-4">
          <p className="font-semibold text-white">{stats.forecastHeadline}</p>
        </div>
        <div className="space-y-3">
          {Object.entries(projectedPoints).sort((a, b) => b[1].projected - a[1].projected).map(([player, data]) => (
            <div key={player}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">{player}</span>
                <span className="text-xs font-mono text-[#8E8E93]">{formatPoints(data.current)} → {formatPoints(data.projected)}</span>
              </div>
              <div className="bg-[#26262e] rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (data.current / Math.max(data.projected, 1)) * 100)}%`, background: data.accent }} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#8E8E93] mt-3">Projection based on current avg pts/game</p>
      </StatCard>
    </div>
  );
}
