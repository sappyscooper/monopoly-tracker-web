import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { DEMO_GAMES } from '../demoData';

const IS_DEMO = import.meta.env.VITE_IS_DEMO === 'true';

export function useAllGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_DEMO) {
      setGames(DEMO_GAMES);
      setLoading(false);
      return undefined;
    }

    const unsub = onSnapshot(collection(db, 'games'), snap => {
      const sortedGames = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
      setGames(sortedGames);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  return { games, loading };
}
