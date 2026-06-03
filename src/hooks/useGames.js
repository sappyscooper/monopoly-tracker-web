import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { DEMO_GAMES } from '../demoData';

const IS_DEMO = import.meta.env.VITE_IS_DEMO === 'true';

export function useGames(seasonId) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seasonId) { setGames([]); setLoading(false); return; }
    if (IS_DEMO) {
      setGames(DEMO_GAMES.filter(game => game.seasonId === seasonId));
      setLoading(false);
      return undefined;
    }

    const q = query(
      collection(db, 'games'),
      where('seasonId', '==', seasonId)
    );
    const unsub = onSnapshot(q, snap => {
      const sortedGames = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
      setGames(sortedGames);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [seasonId]);

  return { games, loading };
}
