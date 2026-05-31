import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export function useGames(seasonId) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seasonId) { setGames([]); setLoading(false); return; }
    const q = query(
      collection(db, 'games'),
      where('seasonId', '==', seasonId),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [seasonId]);

  return { games, loading };
}
