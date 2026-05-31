import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

const CURRENT_VERSION = 2;

const NEW_RULES = [
  {
    title: "The Owner's Right",
    body: "The owner of a property need not be present at the table when rent falls due — so long as their title deed stands unchallenged. However, if the owner doth fail to claim their rent before the next player rolls the dice, the debt is forgiven and the moment is lost. Vigilance is the landlord's sacred duty.",
    order: 0,
  },
  {
    title: 'The Free Parking Treasury',
    body: "All taxes — Income Tax, Luxury Tax, and any fines decreed by Chance or Community Chest — shall be cast unto the centre of the board as tribute to Free Parking. Whosoever's token doth land upon that blessed space shall collect every coin therein. The treasury grows; the fortune awaits. The Bank receiveth nothing from taxes.",
    order: 1,
  },
  {
    title: 'The Honour of Turns',
    body: "It is the sacred duty of all players to announce when another's turn hath arrived. However, it is NOT required to remind a player that rent is owed upon landing. Each soul is responsible for their own obligations. Miss your rent claim and it is forfeit — the dice turn no man's wheels backwards.",
    order: 2,
  },
  {
    title: 'The Declaration of Doubles',
    body: 'Upon rolling doubles, a player must announce it clearly to the table before moving. All assembled must bear witness. Failure to announce is a violation of the sacred covenant — the roll stands, but shame follows. Three doubles in succession sends the transgressor directly to Jail, as is the eternal law.',
    order: 3,
  },
  {
    title: 'The First Round Edict',
    body: 'During the first full circuit of the board — until every player hath passed Go at least once — no property may be purchased by any soul. Furthermore, any player who is sent to Jail during the first round shall not collect $200 for passing Go on that journey. The board must breathe before commerce begins.',
    order: 4,
  },
  {
    title: 'The Departed Soul',
    body: 'Should a player choose to leave the game, or be struck down by circumstance, all their properties, buildings, and remaining gold shall be returned to the Bank forthwith. No inheritance. No transfer. The board reclaims what the board hath given. Their houses are demolished; their deeds go to auction.',
    order: 5,
  },
  {
    title: 'The Mortgage Covenant',
    body: 'Mortgaged properties follow the original agreement: when a mortgaged title deed is transferred between players through trade or bankruptcy, the new owner must pay the Bank the mortgage value plus 10% interest upon taking possession, or immediately upon choosing to unmortgage it. The percentage is sacred — it shall not be negotiated away.',
    order: 6,
  },
  {
    title: 'Three Rounds in Jail',
    body: 'A player incarcerated in Jail must attempt to roll doubles to escape on each of their first three turns. If doubles are not rolled within three turns, the prisoner must pay the $50 fine on their third turn and move according to that roll. One may also pay the $50 fine voluntarily on any of the first two turns before rolling. No languishing beyond three rounds — the board demands movement.',
    order: 7,
  },
  {
    title: 'The Merger Doctrine',
    body: 'Mergers and trades between players are permitted, but each transaction must be of equal and declared value — property for property, money for money, or a fair combination thereof. No gifts. No loans. No charity. Every exchange must see both parties receive something of agreed worth. The board is a marketplace, not a charity house.',
    order: 8,
  },
  {
    title: 'The Sovereignty of Each Player',
    body: "Every player is a separate sovereign entity. No player may act on behalf of another, hold another's money in trust, or make decisions for an absent player. Each soul stands alone before the board. Alliances of intention are permitted; merging of assets into a single pooled entity is not. Two players remain two players — always.",
    order: 9,
  },
  {
    title: 'The Law of Fair Exchange',
    body: 'All trading of property and money must involve a genuine transaction of equal value. The free gifting of money, the loaning of funds without repayment terms, and the giving away of property for nothing are all forbidden. If a deal cannot be agreed upon at fair value, no deal shall be made. The board keeps all honest.',
    order: 10,
  },
  {
    title: 'The No-Markup Decree',
    body: "When trading properties or selling buildings back into a transaction, no player may charge above the Bank's listed price. Properties are traded at agreed value — but that value must reflect the deed's worth, not artificial inflation. The Bank sets the floor; greed shall not set the ceiling beyond reason.",
    order: 11,
  },
  {
    title: 'The Single Merger Rule',
    body: 'A merger — the combining of money and/or property in a single transaction — may only occur between two individual players at a time. No three-way deals. No consortium arrangements. Each transaction is bilateral: one player to one player, one exchange, one moment. Complexity breeds dispute; simplicity preserves the sacred game.',
    order: 12,
  },
  {
    title: 'The Bus Ticket Market',
    body: 'In the Mega Edition, Bus Tickets obtained through the Speed Die, Bus Ticket spaces, or Birthday Gift spaces may be sold between players for exactly $100 — no more, no less. This is the official market rate. Bus Tickets allow movement to any space on the current side of the board; their value is fixed and non-negotiable. All Bus Tickets must be kept face-up and visible to all players.',
    order: 13,
  },
  {
    title: 'The Skyscraper and Depot Limit',
    body: "In Monopoly Mega Edition, buildings follow this sacred hierarchy: Houses → Hotels → Skyscrapers (on complete colour monopolies only). Skyscrapers are the pinnacle of development and may be swapped back to Hotels if financially necessary. Train Depots may be built on any owned railroad for $100 (no monopoly required) and double that railroad's rent. No building beyond Skyscrapers or Depots shall exist — these are the highest forms of dominion on the board.",
    order: 14,
  },
  {
    title: 'The Frozen Moment of Transfer',
    body: "No property shall be transferred, traded, or exchanged between players whilst either the active player or the player immediately preceding them holds the dice in their hand or hath already rolled but not yet completed their turn. The dice are sacred instruments of fate — commerce must wait until the board's business is concluded. A turn in motion cannot be interrupted by transaction.",
    order: 15,
  },
];

let seedInFlight = null;

async function seedRules() {
  if (seedInFlight) return seedInFlight;

  seedInFlight = (async () => {
    const versionRef = doc(db, 'meta', 'rulesVersion');
    const versionSnapshot = await getDoc(versionRef);
    if (versionSnapshot.exists() && versionSnapshot.data().version === CURRENT_VERSION) return;

    const existingRules = await getDocs(collection(db, 'rules'));
    const batch = writeBatch(db);
    const now = Timestamp.now();

    existingRules.docs.forEach(ruleSnapshot => batch.delete(ruleSnapshot.ref));
    NEW_RULES.forEach((rule, index) => {
      const ruleRef = doc(collection(db, 'rules'));
      batch.set(ruleRef, {
        ...rule,
        order: index,
        version: CURRENT_VERSION,
        createdAt: now,
      });
    });
    batch.set(versionRef, { version: CURRENT_VERSION, updatedAt: now });

    await batch.commit();
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
    let unsubscribe;
    let cancelled = false;

    const attachListener = async () => {
      setLoading(true);
      try {
        await seedRules();
        if (cancelled) return;

        const rulesQuery = query(collection(db, 'rules'), orderBy('order', 'asc'));
        unsubscribe = onSnapshot(
          rulesQuery,
          (snapshot) => {
            setRules(snapshot.docs.map(ruleDoc => ({ id: ruleDoc.id, ...ruleDoc.data() })));
            setLoading(false);
            setError(null);
          },
          (snapshotError) => {
            console.error(snapshotError);
            setError(snapshotError);
            setLoading(false);
          }
        );
      } catch (seedError) {
        console.error(seedError);
        setError(seedError);
        setLoading(false);
      }
    };

    attachListener();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const addRule = async (title, body) => {
    const nextOrder = rules.reduce((maxOrder, rule) => Math.max(maxOrder, Number(rule.order) || 0), -1) + 1;

    await addDoc(collection(db, 'rules'), {
      title,
      body,
      createdAt: Timestamp.now(),
      order: nextOrder,
      version: CURRENT_VERSION,
    });
  };

  const updateRule = async (ruleId, title, body) => {
    await updateDoc(doc(db, 'rules', ruleId), {
      title,
      body,
      updatedAt: Timestamp.now(),
    });
  };

  const deleteRule = async (ruleId) => {
    await deleteDoc(doc(db, 'rules', ruleId));
  };

  return { rules, loading, error, addRule, updateRule, deleteRule };
}
