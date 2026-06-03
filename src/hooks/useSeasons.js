import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { DEMO_SEASONS } from '../demoData';

const IS_DEMO = import.meta.env.VITE_IS_DEMO === 'true';

export function useSeasons() {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_DEMO) {
      setSeasons(DEMO_SEASONS);
      setLoading(false);
      return undefined;
    }

    const q = query(collection(db, 'seasons'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setSeasons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  return { seasons, loading };
}
