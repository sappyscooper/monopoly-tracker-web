const PLAYERS = ['Marcus', 'Priya', 'Jordan', 'Yuki', 'Felix'];

function demoTimestamp(value) {
  const date = new Date(`${value}T12:00:00Z`);
  return {
    seconds: Math.floor(date.getTime() / 1000),
    toDate: () => new Date(date),
  };
}

function makeGame(id, seasonId, date, order, cameos = []) {
  return {
    id,
    seasonId,
    date: demoTimestamp(date),
    placements: order.map((player, index) => ({
      player,
      placing: index + 1,
      isCameo: cameos.includes(player),
      isAbsent: false,
    })),
    createdAt: demoTimestamp(date),
  };
}

export const DEMO_PLAYERS = PLAYERS;

export const DEMO_SEASONS = [
  {
    id: 'demo-season-2',
    name: 'Season 2',
    startDate: demoTimestamp('2026-01-10'),
    endDate: demoTimestamp('2026-07-31'),
    regularPlayers: PLAYERS,
    isActive: true,
    createdAt: demoTimestamp('2026-01-10'),
  },
  {
    id: 'demo-season-1',
    name: 'Season 1',
    startDate: demoTimestamp('2025-06-01'),
    endDate: demoTimestamp('2025-12-31'),
    regularPlayers: PLAYERS,
    isActive: false,
    createdAt: demoTimestamp('2025-06-01'),
  },
];

export const DEMO_GAMES = [
  makeGame('demo-s2-game-8', 'demo-season-2', '2026-05-10', ['Yuki', 'Priya', 'Marcus', 'Felix', 'Jordan']),
  makeGame('demo-s2-game-7', 'demo-season-2', '2026-04-19', ['Marcus', 'Felix', 'Jordan', 'Priya', 'Yuki']),
  makeGame('demo-s2-game-6', 'demo-season-2', '2026-04-05', ['Priya', 'Sam', 'Marcus', 'Yuki', 'Jordan', 'Felix'], ['Sam']),
  makeGame('demo-s2-game-5', 'demo-season-2', '2026-03-22', ['Felix', 'Priya', 'Marcus', 'Yuki', 'Jordan']),
  makeGame('demo-s2-game-4', 'demo-season-2', '2026-03-01', ['Marcus', 'Jordan', 'Priya', 'Felix', 'Yuki']),
  makeGame('demo-s2-game-3', 'demo-season-2', '2026-02-15', ['Jordan', 'Alex', 'Felix', 'Marcus', 'Priya', 'Yuki'], ['Alex']),
  makeGame('demo-s2-game-2', 'demo-season-2', '2026-02-01', ['Yuki', 'Marcus', 'Felix', 'Priya', 'Jordan']),
  makeGame('demo-s2-game-1', 'demo-season-2', '2026-01-18', ['Marcus', 'Priya', 'Jordan', 'Yuki', 'Felix']),
  makeGame('demo-s1-game-6', 'demo-season-1', '2025-12-06', ['Jordan', 'Marcus', 'Priya', 'Yuki', 'Felix']),
  makeGame('demo-s1-game-5', 'demo-season-1', '2025-11-08', ['Marcus', 'Yuki', 'Felix', 'Jordan', 'Priya']),
  makeGame('demo-s1-game-4', 'demo-season-1', '2025-10-11', ['Priya', 'Jordan', 'Yuki', 'Felix', 'Marcus']),
  makeGame('demo-s1-game-3', 'demo-season-1', '2025-09-13', ['Yuki', 'Felix', 'Marcus', 'Priya', 'Jordan']),
  makeGame('demo-s1-game-2', 'demo-season-1', '2025-08-02', ['Felix', 'Marcus', 'Priya', 'Jordan', 'Yuki']),
  makeGame('demo-s1-game-1', 'demo-season-1', '2025-07-05', ['Marcus', 'Priya', 'Jordan', 'Yuki', 'Felix']),
];

export const DEMO_RULES = [
  {
    id: 'demo-rule-1',
    title: "The Banker's Oath",
    body: 'The designated banker must declare their role before the game begins. Any banker caught stealing from the bank forfeits their next turn and pays a $200 fine to Free Parking.',
    order: 0,
    createdAt: demoTimestamp('2026-01-01'),
  },
  {
    id: 'demo-rule-2',
    title: 'The Free Parking Jackpot',
    body: 'All taxes, fines, and fees paid to the bank are placed in the centre of the board. The first player to land on Free Parking collects the entire pot.',
    order: 1,
    createdAt: demoTimestamp('2026-01-01'),
  },
  {
    id: 'demo-rule-3',
    title: 'The Speed Die Rule',
    body: 'After Round 5, the Speed Die is introduced. Its power is absolute and cannot be disputed by any player, living or bankrupt.',
    order: 2,
    createdAt: demoTimestamp('2026-01-01'),
  },
  {
    id: 'demo-rule-4',
    title: 'The Debt Forgiveness Clause',
    body: 'A player who cannot pay their debt may negotiate a trade deal with their creditor. The creditor has the right to refuse. If no deal is struck, bankruptcy proceeds as normal.',
    order: 3,
    createdAt: demoTimestamp('2026-01-01'),
  },
  {
    id: 'demo-rule-5',
    title: 'The Auction Mandate',
    body: 'Any property landed upon and declined by its occupant must go to immediate public auction. Minimum bid is $1. Silence is cowardice.',
    order: 4,
    createdAt: demoTimestamp('2026-01-01'),
  },
  {
    id: 'demo-rule-6',
    title: 'The Degen Tax',
    body: 'The last place player at end of game must perform a dare agreed upon by the group before the game starts. The dare is non-negotiable and cannot be refused.',
    order: 5,
    createdAt: demoTimestamp('2026-01-01'),
  },
];
