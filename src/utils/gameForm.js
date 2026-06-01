export function normalizeParticipantName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function cleanParticipantName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

export function collectCameoNames(games = []) {
  const byName = new Map();

  games.forEach(game => {
    (game.placements || []).forEach(placement => {
      if (!placement.isCameo) return;
      const cleanName = cleanParticipantName(placement.player);
      const key = normalizeParticipantName(cleanName);
      if (!key || byName.has(key)) return;
      byName.set(key, cleanName);
    });
  });

  return Array.from(byName.values()).sort((a, b) => a.localeCompare(b));
}

export function canonicalParticipantName(name, knownNames = []) {
  const cleanName = cleanParticipantName(name);
  const key = normalizeParticipantName(cleanName);
  const existing = knownNames.find(candidate => normalizeParticipantName(candidate) === key);
  return existing || cleanName;
}

export function makeSeasonEntries(season) {
  return (season?.regularPlayers || []).map((player, index) => ({
    id: `regular-${index}-${player}`,
    player,
    isCameo: false,
    isAbsent: false,
  }));
}

export function makeGameEntries(season, game) {
  const placements = [...(game?.placements || [])].sort((a, b) => a.placing - b.placing);
  const entries = placements.map((placement, index) => ({
    id: placement.isCameo
      ? `cameo-${index}-${placement.player}`
      : `regular-${index}-${placement.player}`,
    player: placement.player,
    isCameo: Boolean(placement.isCameo),
    isAbsent: Boolean(placement.isAbsent),
  }));

  const existingRegulars = new Set(
    entries.filter(entry => !entry.isCameo).map(entry => normalizeParticipantName(entry.player))
  );
  const missingRegulars = (season?.regularPlayers || [])
    .filter(player => !existingRegulars.has(normalizeParticipantName(player)))
    .map((player, index) => ({
      id: `regular-missing-${index}-${player}`,
      player,
      isCameo: false,
      isAbsent: true,
    }));

  return [...entries, ...missingRegulars];
}

export function buildPlacementsFromEntries(entries = []) {
  const placements = [];
  let placing = 1;
  const rankedEntries = entries.filter(entry => !entry.isAbsent);
  const absentRegulars = entries.filter(entry => !entry.isCameo && entry.isAbsent);

  rankedEntries.forEach(entry => {
    placements.push({
      player: entry.player,
      placing,
      isCameo: Boolean(entry.isCameo),
      isAbsent: false,
    });
    placing++;
  });

  absentRegulars.forEach(entry => {
    placements.push({
      player: entry.player,
      placing,
      isCameo: false,
      isAbsent: true,
    });
    placing++;
  });

  return placements;
}

export function gameDateInputValue(game, fallbackDate = new Date()) {
  const date = game?.date?.toDate ? game.date.toDate() : fallbackDate;
  return date.toISOString().split('T')[0];
}
