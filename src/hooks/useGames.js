import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export function useGames(seasonId) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seasonId) { setGames([]); setLoading(false); return; }
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
