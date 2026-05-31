import { useSeasons } from './useSeasons';

export function useActiveSeason() {
  const { seasons, loading } = useSeasons();
  const activeSeason = seasons.find(s => s.isActive) || seasons[0] || null;
  return { activeSeason, seasons, loading };
}
