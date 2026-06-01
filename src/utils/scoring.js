export const BASE_POINTS = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };

function pointsForPlace(place) {
  return BASE_POINTS[place] ?? BASE_POINTS[5];
}

export function calculateGamePoints(placements = []) {
  const regularPlacements = placements
    .filter(p => !p.isCameo)
    .sort((a, b) => a.placing - b.placing);
  const scores = {};
  regularPlacements.forEach((placement, index) => {
    scores[placement.player] = pointsForPlace(index + 1);
  });
  return scores;
}

export function seasonLeaderboard(games, regularPlayers) {
  const totals = {};
  regularPlayers.forEach(p => totals[p] = 0);
  games.forEach(game => {
    const pts = calculateGamePoints(game.placements);
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
