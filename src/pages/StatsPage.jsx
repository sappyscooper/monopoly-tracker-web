import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';
import { useActiveSeason } from '../hooks/useActiveSeason';
import { useAllGames } from '../hooks/useAllGames';
import { useGames } from '../hooks/useGames';
import { POINT_SCALE_LABEL, calculateGamePoints, formatPoints } from '../utils/scoring';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Sheet from '../components/Sheet';

const ACCENTS = ['#E8C96A', '#6EB5D4', '#E07B6A', '#d4a760', '#8EB5D4'];

function formatOne(value) {
  return Number(value || 0).toFixed(1);
}

function InfoModal({ title, explanation, onClose }) {
  return (
    <Sheet open title={title} subtitle="About this stat" onClose={onClose}>
      <p className="secondary-text leading-relaxed">{explanation}</p>
      <button className="secondary-button mt-5" onClick={onClose}>Done</button>
    </Sheet>
  );
}

function StatCard({ title, explanation, children }) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <>
      <GlassCard>
        <div className="stats-card-header">
          <h3 className="stats-card-title">{title}</h3>
          <button onClick={() => setShowInfo(true)} className="info-button" aria-label={`About ${title}`}>
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

function StatsInlineEmptyState({ children }) {
  return <div className="stats-inline-empty">{children}</div>;
}

function MiniSparkline({ values, color }) {
  const safeValues = values?.length ? values : [0];
  const max = Math.max(...safeValues, 1);
  const min = Math.min(...safeValues, 0);
  const range = Math.max(max - min, 1);
  const points = safeValues.map((value, index) => {
    const x = safeValues.length === 1 ? 52 : (index / (safeValues.length - 1)) * 52 + 2;
    const y = 22 - ((value - min) / range) * 18;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="sparkline-box" viewBox="0 0 56 24" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points.split(' ').at(-1)?.split(',')[0] || 52} cy={points.split(' ').at(-1)?.split(',')[1] || 12} r="2.4" fill={color} />
    </svg>
  );
}

function computeStats(season, games, options = {}) {
  if (!season || !games.length) return null;
  const players = options.players || season.regularPlayers || [];
  const pointsForGame = options.pointsForGame || ((game) => calculateGamePoints(game.placements || []));
  const sortedGamesDesc = [...games].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
  const sortedGamesAsc = [...games].sort((a, b) => (a.date?.seconds || 0) - (b.date?.seconds || 0));

  const totals = Object.fromEntries(players.map(player => [player, 0]));
  games.forEach(game => {
    Object.entries(pointsForGame(game)).forEach(([player, points]) => {
      if (totals[player] !== undefined) totals[player] += points;
    });
  });
  const leaderboard = Object.entries(totals)
    .map(([player, points]) => ({ player, points }))
    .sort((a, b) => b.points - a.points || a.player.localeCompare(b.player));
  const totalGames = games.length;

  const now = new Date();
  const endDate = season.endDate?.toDate ? season.endDate.toDate() : new Date(season.endDate);
  const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
  const remainingGames = options.remainingGames ?? Math.max(0, Math.ceil(daysLeft / 7));

  const gamesPlayedByPlayer = Object.fromEntries(players.map(player => [player, 0]));
  games.forEach(game => {
    game.placements?.forEach(placement => {
      if (!placement.isCameo && gamesPlayedByPlayer[placement.player] !== undefined) {
        gamesPlayedByPlayer[placement.player]++;
      }
    });
  });

  const leaderboardWithAvg = leaderboard.map((row, index) => {
    const gamesPlayed = gamesPlayedByPlayer[row.player] || 0;
    const avg = gamesPlayed > 0 ? row.points / gamesPlayed : 0;
    const recentGames = sortedGamesDesc.slice(0, 5).reverse();
    const sparkline = recentGames.map(game => pointsForGame(game)[row.player] ?? 0);
    return { ...row, gamesPlayed, avg, sparkline, accent: ACCENTS[index % ACCENTS.length] };
  });

  let rivalry = { pair: 'Not enough data', gap: 0 };
  let rivalryGap = Infinity;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const diffs = games.flatMap(game => {
        const first = game.placements?.find(placement => placement.player === players[i] && !placement.isCameo);
        const second = game.placements?.find(placement => placement.player === players[j] && !placement.isCameo);
        if (!first || !second) return [];
        return [Math.abs(first.placing - second.placing)];
      });
      if (!diffs.length) continue;
      const avg = diffs.reduce((total, value) => total + value, 0) / diffs.length;
      if (avg < rivalryGap) {
        rivalryGap = avg;
        rivalry = { pair: `${players[i]} vs ${players[j]}`, gap: avg };
      }
    }
  }

  const podiumCounts = Object.fromEntries(players.map(player => [player, { first: 0, second: 0, third: 0, last: 0 }]));
  games.forEach(game => {
    const regulars = (game.placements || []).filter(placement => !placement.isCameo).sort((a, b) => a.placing - b.placing);
    const lastPlacing = regulars[regulars.length - 1]?.placing;
    regulars.forEach(placement => {
      if (!podiumCounts[placement.player]) return;
      if (placement.placing === 1) podiumCounts[placement.player].first++;
      if (placement.placing === 2) podiumCounts[placement.player].second++;
      if (placement.placing === 3) podiumCounts[placement.player].third++;
      if (placement.placing === lastPlacing) podiumCounts[placement.player].last++;
    });
  });

  const mostFirsts = players.reduce((best, player) => (!best || podiumCounts[player].first > podiumCounts[best].first) ? player : best, null);
  const mostLasts = players.reduce((best, player) => (!best || podiumCounts[player].last > podiumCounts[best].last) ? player : best, null);

  const headToHead = {};
  players.forEach(row => {
    headToHead[row] = {};
    players.forEach(col => {
      if (row === col) {
        headToHead[row][col] = null;
        return;
      }
      const vals = games.flatMap(game => {
        const rowPlacement = game.placements?.find(placement => placement.player === row && !placement.isCameo);
        const colPlacement = game.placements?.find(placement => placement.player === col && !placement.isCameo);
        if (!rowPlacement || !colPlacement) return [];
        return [rowPlacement.placing];
      });
      headToHead[row][col] = vals.length ? vals.reduce((total, value) => total + value, 0) / vals.length : null;
    });
  });

  const cameoPlacements = games.flatMap(game => (game.placements || []).filter(placement => placement.isCameo));
  const cameoByPlayer = {};
  cameoPlacements.forEach(placement => {
    if (!cameoByPlayer[placement.player]) cameoByPlayer[placement.player] = [];
    cameoByPlayer[placement.player].push(placement.placing);
  });
  const cameoRows = Object.entries(cameoByPlayer).map(([name, placings]) => ({
    name,
    games: placings.length,
    avgPlacing: placings.reduce((total, value) => total + value, 0) / placings.length,
  })).sort((a, b) => b.games - a.games);

  const recentForm = {};
  const streaks = {};
  players.forEach(player => {
    const recents = sortedGamesDesc.slice(0, 5).map(game => (
      game.placements?.find(placement => placement.player === player && !placement.isCameo)?.placing ?? null
    ));
    recentForm[player] = [...recents].reverse();

    let hotCount = 0;
    for (const placing of recents) {
      if (placing === null || placing > 2) break;
      hotCount++;
    }
    streaks[player] = hotCount >= 2 ? { type: 'hot', count: hotCount } : { type: null };
  });

  const totalEstimated = totalGames + remainingGames;
  const projectedPoints = {};
  leaderboardWithAvg.forEach(row => {
    projectedPoints[row.player] = {
      current: row.points,
      projected: row.avg * totalEstimated,
      accent: row.accent,
    };
  });
  const projectedRows = Object.entries(projectedPoints)
    .map(([player, data]) => ({ player, ...data }))
    .sort((a, b) => b.projected - a.projected);
  const forecastHeadline = totalGames < 2 ? 'Ask again after a few more games'
    : projectedRows.length >= 2 && projectedRows[0].projected - projectedRows[1].projected > 5
      ? `${projectedRows[0].player} is on track to win 🏆`
      : "It's too close to call";

  const dominant = leaderboardWithAvg[0];

  return {
    totalGames,
    remainingGames,
    leaderboard: leaderboardWithAvg,
    mostDominantPlayer: dominant?.player || 'Not enough data',
    mostDominantAvg: dominant?.avg || 0,
    biggestRivalry: rivalry.pair,
    biggestRivalryGap: rivalry.gap,
    podiumCounts,
    mostFirsts,
    mostLasts,
    headToHead,
    players,
    totalCameoAppearances: cameoPlacements.length,
    cameoRows,
    recentForm,
    streaks,
    projectedRows,
    forecastHeadline,
    projectedWinner: projectedRows[0]?.player,
    projectedLoser: projectedRows.at(-1)?.player,
    sortedGamesAsc,
  };
}

export default function StatsPage() {
  const [scope, setScope] = useState('season');
  const { activeSeason: season, seasons, loading: seasonsLoading } = useActiveSeason();
  const { games, loading: gamesLoading } = useGames(season?.id);
  const { games: allGames, loading: allGamesLoading } = useAllGames();

  const lifetimePlayers = useMemo(() => {
    const seen = new Set();
    const players = [];
    (seasons || []).forEach(item => {
      (item.regularPlayers || []).forEach(player => {
        const key = player.trim().toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        players.push(player.trim());
      });
    });
    (allGames || []).forEach(game => {
      (game.placements || []).forEach(placement => {
        if (placement.isCameo) return;
        const key = placement.player.trim().toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        players.push(placement.player.trim());
      });
    });
    return players;
  }, [seasons, allGames]);

  const lifetimeSeason = useMemo(() => ({
    id: 'lifetime',
    name: 'Lifetime',
    regularPlayers: lifetimePlayers,
    startDate: seasons?.at(-1)?.startDate || new Date(),
    endDate: new Date(),
    isActive: true,
  }), [lifetimePlayers, seasons]);

  const seasonStats = useMemo(() => computeStats(season, games || []), [season, games]);
  const lifetimeStats = useMemo(() => computeStats(lifetimeSeason, allGames || [], {
    players: lifetimePlayers,
    remainingGames: 0,
    pointsForGame: (game) => calculateGamePoints(game.placements || []),
  }), [lifetimeSeason, allGames, lifetimePlayers]);

  const selectedStats = scope === 'lifetime' ? lifetimeStats : seasonStats;
  const selectedSeason = scope === 'lifetime' ? lifetimeSeason : season;
  const loading = seasonsLoading || gamesLoading || allGamesLoading;

  if (loading) return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="page-title">Season Stats</h1>
        </div>
      </header>
      <div className="page-inner flex min-h-[60dvh] items-center justify-center">
        <div className="secondary-text">Loading stats...</div>
      </div>
    </div>
  );

  if (!season) return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="page-title">Season Stats</h1>
        </div>
      </header>
      <div className="page-inner">
        <EmptyState icon="📊" title="No active season" message="Start a season to see your stats unfold." />
      </div>
    </div>
  );

  const ScopeTabs = (
    <div className="stats-scope-tabs" role="tablist" aria-label="Stats scope">
      <button
        type="button"
        className={scope === 'season' ? 'active' : ''}
        onClick={() => setScope('season')}
      >
        This Season
      </button>
      <button
        type="button"
        className={scope === 'lifetime' ? 'active' : ''}
        onClick={() => setScope('lifetime')}
      >
        Lifetime
      </button>
    </div>
  );

  if (!selectedStats) return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="min-w-0">
            <h1 className="page-title">Season Stats</h1>
            <p className="secondary-text truncate">{selectedSeason?.name}</p>
          </div>
        </div>
      </header>
      <div className="page-inner">
        {ScopeTabs}
        <div className="mt-8"><EmptyState icon="🎲" title="No games yet" message="Log your first game to see stats." /></div>
      </div>
    </div>
  );

  const stats = selectedStats;
  const isLifetime = scope === 'lifetime';
  const { leaderboard, players, headToHead, recentForm, streaks, cameoRows, projectedRows } = stats;
  const maxAvg = Math.max(...leaderboard.map(row => row.avg), 1);
  const maxProjected = Math.max(...projectedRows.map(row => row.projected), 1);

  return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="min-w-0">
            <h1 className="page-title">Season Stats</h1>
            <p className="secondary-text truncate">{isLifetime ? `${allGames.length} games across ${seasons.length} seasons` : season.name}</p>
          </div>
        </div>
      </header>

      <div className="page-inner stats-stack">
        {ScopeTabs}

        <StatCard title={isLifetime ? 'Lifetime at a Glance' : 'Season at a Glance'} explanation={isLifetime ? 'A career-level view across every season and every logged game. Highest Avg is calculated from games each player actually played.' : 'A quick overview of where your season stands. Total Games counts every game logged. Est. Remaining is a rough projection based on end date. Highest Avg shows who earns the most points per game. Closest Rivals names the two players with the smallest average placing gap.'}>
          <div className="snapshot-grid">
            {(isLifetime ? [
              { value: stats.totalGames, sub: 'lifetime games played' },
              { value: seasons.length, sub: 'seasons tracked' },
              { value: stats.mostDominantPlayer, sub: `${formatOne(stats.mostDominantAvg)} pts/game avg` },
              { value: stats.biggestRivalry, sub: `closest rivals, avg ${formatOne(stats.biggestRivalryGap)} gap` },
            ] : [
              { value: stats.totalGames, sub: 'games played so far' },
              { value: stats.remainingGames, sub: 'games left this season' },
              { value: stats.mostDominantPlayer, sub: `${formatOne(stats.mostDominantAvg)} pts/game avg` },
              { value: stats.biggestRivalry, sub: `closest rivals, avg ${formatOne(stats.biggestRivalryGap)} gap` },
            ]).map(tile => (
              <div key={`${tile.value}-${tile.sub}`} className="snapshot-tile">
                <p className="snapshot-value">{tile.value}</p>
                <p className="snapshot-subtext">{tile.sub}</p>
              </div>
            ))}
          </div>
        </StatCard>

        <StatCard title={isLifetime ? 'All-Time Standings' : "Who's Winning Right Now"} explanation="Current standings with sparklines showing each player's latest scoring trend. Trend badges appear once there are enough games to compare momentum.">
          {leaderboard.length === 0 ? (
            <StatsInlineEmptyState>Log a game to generate standings.</StatsInlineEmptyState>
          ) : (
            <>
              <div>
                {leaderboard.map((row, index) => {
                  const values = row.sparkline || [];
                  const recent2 = values.length >= 2 ? (values.slice(-2).reduce((a, b) => a + b, 0) / 2) : 0;
                  const before2 = values.length >= 4 ? (values.slice(-4, -2).reduce((a, b) => a + b, 0) / 2) : null;
                  let badge = null;
                  if (before2 !== null && values.length >= 4) {
                    if (recent2 > before2 + 0.5) badge = { label: 'Hot', color: '#6EB5D4', bg: 'rgba(110,181,212,0.18)' };
                    else if (recent2 < before2 - 0.5) badge = { label: 'Cold', color: '#E07B6A', bg: 'rgba(224,123,106,0.18)' };
                    else badge = { label: 'Stable', color: '#8E8E93', bg: 'rgba(255,255,255,0.08)' };
                  }
                  return (
                    <div key={row.player} className="leader-row">
                      <span className="rank-badge" style={{ color: row.accent }}>{index + 1}</span>
                      <span className="leader-name">{row.player}</span>
                      <MiniSparkline values={values} color={row.accent} />
                      {badge && <span className="trend-badge" style={{ color: badge.color, background: badge.bg }}>{badge.label}</span>}
                      <span className="leader-points">{formatPoints(row.points)}</span>
                    </div>
                  );
                })}
              </div>
              {leaderboard.length >= 2 && (
                <div className="context-callout">
                  {leaderboard[0].points - leaderboard[1].points < 3
                    ? `${leaderboard[0].player} and ${leaderboard[1].player} are neck and neck`
                    : `${leaderboard[0].player} leads with ${formatPoints(leaderboard[0].points)} pts`}
                </div>
              )}
            </>
          )}
        </StatCard>

        <StatCard title={isLifetime ? 'Lifetime Consistency' : 'Consistency Score'} explanation="Average points per game played. This shows who performs steadily, not just who has the highest total.">
          <div className="space-y-2">
            {[...leaderboard].sort((a, b) => b.avg - a.avg).map((row, index, arr) => (
              <div key={row.player} className="bar-row">
                <span className="bar-label">{row.player}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.max(0, (row.avg / maxAvg) * 100)}%`, background: row.accent }}>
                    <span className="bar-value">
                      {formatOne(row.avg)} {index === 0 ? '👑' : index === arr.length - 1 ? '👻' : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </StatCard>

        <StatCard title="Podium Record" explanation="How many times each player has finished first, second, or third. The highlight tiles call out the most wins and most last-place finishes.">
          <div>
            {players.map(player => (
              <div key={player} className="podium-row">
                <span className="podium-player">{player}</span>
                <span className="podium-pill" style={{ color: '#E8C96A', background: 'rgba(232,201,106,0.12)' }}>🥇 {stats.podiumCounts[player]?.first || 0}</span>
                <span className="podium-pill" style={{ color: '#C0C0C0', background: 'rgba(255,255,255,0.08)' }}>🥈 {stats.podiumCounts[player]?.second || 0}</span>
                <span className="podium-pill" style={{ color: '#CD7F32', background: 'rgba(205,127,50,0.12)' }}>🥉 {stats.podiumCounts[player]?.third || 0}</span>
              </div>
            ))}
          </div>
          <div className="highlight-row mt-3">
            <div className="highlight-tile">
              <p className="text-xs text-[#8E8E93]">Winning Machine 🏆</p>
              <p className="mt-1 truncate font-bold text-[#E8C96A]">{stats.mostFirsts || 'Not yet'}</p>
              <p className="text-xs text-[#8E8E93]">x{stats.podiumCounts[stats.mostFirsts]?.first || 0} wins</p>
            </div>
            <div className="highlight-tile">
              <p className="text-xs text-[#8E8E93]">Perma-Loser 💀</p>
              <p className="mt-1 truncate font-bold text-[#E07B6A]">{stats.mostLasts || 'Not yet'}</p>
              <p className="text-xs text-[#8E8E93]">x{stats.podiumCounts[stats.mostLasts]?.last || 0} lasts</p>
            </div>
          </div>
        </StatCard>

        <StatCard title="Who Beats Who" explanation="Average finishing position in games where each opponent was also playing. Lower is better.">
          {stats.totalGames < 2 ? (
            <StatsInlineEmptyState>Head-to-head gets more useful after at least 2 games.</StatsInlineEmptyState>
          ) : (
            <>
              <div className="matrix-legend">
                <span><i className="legend-dot" style={{ background: '#6EB5D4' }} /> You beat them</span>
                <span><i className="legend-dot" style={{ background: '#E07B6A' }} /> They beat you</span>
                <span><i className="legend-dot" style={{ background: '#8E8E93' }} /> Even</span>
              </div>
              <div className="matrix-wrapper matrix">
                <table>
                  <thead>
                    <tr>
                      <th />
                      {players.map(player => <th key={player}>{player.slice(0, 4)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(row => (
                      <tr key={row}>
                        <td>{row.slice(0, 4)}</td>
                        {players.map(col => {
                          const value = headToHead[row]?.[col];
                          const style = value === null ? { background: 'transparent', color: '#48484A' }
                            : value < 2.5 ? { background: 'rgba(110,181,212,0.20)', color: '#6EB5D4' }
                              : value > 3.5 ? { background: 'rgba(224,123,106,0.20)', color: '#E07B6A' }
                                : { background: 'rgba(255,255,255,0.04)', color: '#8E8E93' };
                          return <td key={col} style={style}>{value !== null ? value.toFixed(1) : '-'}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </StatCard>

        <StatCard title="Guest Appearances" explanation="Tracks cameo guests who joined without being in the regular season. Point sliding skips guests for scoring, so regular players are ranked only against each other and slide up to claim the available points.">
          {stats.totalCameoAppearances === 0 ? (
              <StatsInlineEmptyState>No cameo guests have joined {isLifetime ? 'yet' : 'this season yet'}.</StatsInlineEmptyState>
          ) : (
            <>
              <div className="cameo-delta-tile cameo-delta-neutral">
                <p className="cameo-delta-title">{stats.totalCameoAppearances} guest appearance{stats.totalCameoAppearances === 1 ? '' : 's'}</p>
                <p className="cameo-delta-subtext">Guests are skipped for points; regular players slide up</p>
              </div>
              <div>
                {cameoRows.map(row => (
                  <div key={row.name} className="guest-stat-row">
                    <span className="flex-1 truncate font-semibold text-[#E8C96A]">{row.name}</span>
                    <span className="text-sm text-[#8E8E93]">{row.games} games</span>
                    <span className="number-text rounded-full bg-[#E8C96A]/15 px-2 py-1 text-xs text-[#E8C96A]">avg {formatOne(row.avgPlacing)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </StatCard>

        <StatCard title="Recent Form" explanation="The last 5 games at a glance. Gold is 1st, silver is 2nd, bronze is 3rd, dark circles are lower finishes, and empty circles mean not played yet.">
          <div>
            {players.map(player => {
              const placings = recentForm[player] || [];
              const streak = streaks[player];
              return (
                <div key={player} className="form-row">
                  <span className="form-player-name">{player}</span>
                  <span className="streak-badge">{streak?.type === 'hot' ? `🔥 ${streak.count}-game streak` : ''}</span>
                  <div className="form-circles">
                    {Array(5).fill(null).map((_, index) => {
                      const placing = placings[index];
                      const klass = placing === null || placing === undefined ? 'form-empty'
                        : placing === 1 ? 'form-1st'
                          : placing === 2 ? 'form-2nd'
                            : placing === 3 ? 'form-3rd'
                              : 'form-lower';
                      return (
                        <span key={index} className={`form-circle ${klass}`}>
                          {placing && placing > 3 ? placing : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </StatCard>

        <StatCard title={isLifetime ? 'Lifetime Pace' : 'End of Season Forecast'} explanation={isLifetime ? 'All-time totals and average scoring pace across every logged game.' : 'A rough forecast of final standings if current scoring rates continue. It multiplies each player’s average points per game by estimated total games.'}>
          <div className="forecast-headline !mt-0">{isLifetime ? 'All-time totals so far' : stats.forecastHeadline}</div>
          <div className="mt-3 space-y-3">
            {projectedRows.map(row => (
              <div key={row.player} className="projection-row">
                <span className="projection-name">{row.player}</span>
                <div className="projection-bar">
                  <div className="projection-fill" style={{ width: `${Math.max(3, (row.projected / maxProjected) * 100)}%`, background: row.accent }} />
                </div>
                <span className="projection-points">
                  {isLifetime ? `${formatPoints(row.current)} pts` : `${formatPoints(row.current)} → ${formatPoints(row.projected)} pts`}
                </span>
                <span className="w-5 text-center text-sm">
                  {row.player === stats.projectedWinner ? '🏆' : row.player === stats.projectedLoser ? '💀' : ''}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#8E8E93]">{isLifetime ? `Lifetime uses the current ${POINT_SCALE_LABEL} scoring scale` : 'Projection based on current avg pts/game'}</p>
        </StatCard>
      </div>
    </div>
  );
}
