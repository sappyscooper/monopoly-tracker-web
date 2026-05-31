import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export const DEFAULT_RULES = [
  {
    title: 'The Sacred Opening',
    body: 'Upon the commencement of each holy game, every soul at the board shall contribute $200 to the Free Parking treasury. Those who refuse shall be cast out and branded a coward.',
    order: 0,
  },
  {
    title: 'The Free Parking Blessing',
    body: "Whosoever's token doth land upon Free Parking shall receive all taxes and fines accumulated therein. This is the divine reward for the faithful wanderer.",
    order: 1,
  },
  {
    title: 'The Bankruptcy Ritual',
    body: 'When a player is rendered bankrupt by another, the victor inherits ALL properties, improvements, and remaining gold. No mercy shall be shown. No quarter given.',
    order: 2,
  },
  {
    title: 'The Speed Die Covenant',
    body: 'The Speed Die shall be rolled alongside the two standard dice in all games exceeding three hours. Time is sacred. The board waits for no degenerate.',
    order: 3,
  },
  {
    title: 'The Cameo Tax',
    body: 'Any guest who dares enter our sacred contest as a Cameo shall pay a tribute of one round of drinks to the table, regardless of their finishing position. Participation has a price.',
    order: 4,
  },
  {
    title: "The Champion's Burden",
    body: 'The season champion shall carry the holy Monopoly box to every subsequent gathering until their reign is ended. The box is honour. The box is legacy. The box is theirs.',
    order: 5,
  },
];

let seedInFlight = null;

async function seedDefaultRules() {
  if (seedInFlight) return seedInFlight;

  seedInFlight = (async () => {
    const existing = await getDocs(collection(db, 'rules'));
    if (!existing.empty) return;

    for (const rule of DEFAULT_RULES) {
      await addDoc(collection(db, 'rules'), {
        ...rule,
        createdAt: Timestamp.now(),
      });
    }
  })();

  try {
    await seedInFlight;
  } finally {
    seedInFlight = null;
  }
}

export function useRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const rulesQuery = query(collection(db, 'rules'), orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(
      rulesQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setRules([]);
          setLoading(false);
          seedDefaultRules().catch((seedError) => {
            console.error(seedError);
            setError(seedError);
          });
          return;
        }

        setRules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const addRule = async (title, body) => {
    await addDoc(collection(db, 'rules'), {
      title,
      body,
      createdAt: Timestamp.now(),
      order: rules.length,
    });
  };

  return { rules, loading, error, addRule };
}
