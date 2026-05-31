export const BASE_POINTS = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 1 };

export function interpolatedPoints(effectivePlacing) {
  const lower = Math.floor(effectivePlacing);
  const upper = Math.ceil(effectivePlacing);
  const fraction = effectivePlacing - lower;
  const pLow = BASE_POINTS[lower] ?? 0;
  const pHigh = BASE_POINTS[upper] ?? 0;
  return pLow - (pLow - pHigh) * fraction;
}

export function calculateGamePoints(placements, cameoWeight = 0.5) {
  const regularPlacements = placements
    .filter(p => !p.isCameo)
    .sort((a, b) => a.placing - b.placing);
  const scores = {};
  regularPlacements.forEach((placement, index) => {
    const rankAmongRegulars = index + 1;
    const cameosAhead = placements.filter(
      p => p.isCameo && p.placing < placement.placing
    ).length;
    const effectivePlacing = rankAmongRegulars + cameosAhead * cameoWeight;
    scores[placement.player] = interpolatedPoints(effectivePlacing);
  });
  return scores;
}

export function seasonLeaderboard(games, regularPlayers, cameoWeight) {
  const totals = {};
  regularPlayers.forEach(p => totals[p] = 0);
  games.forEach(game => {
    const pts = calculateGamePoints(game.placements, cameoWeight);
    Object.entries(pts).forEach(([player, points]) => {
      if (totals[player] !== undefined) totals[player] += points;
    });
  });
  return Object.entries(totals)
    .map(([player, points]) => ({ player, points }))
    .sort((a, b) => b.points - a.points || a.player.localeCompare(b.player));
}

export function formatPoints(pts) {
  return Number.isInteger(pts) ? pts.toString() : pts.toFixed(1);
}
