import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleDot, Plus, Trash2 } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useSeasons } from '../hooks/useSeasons';
import { useGames } from '../hooks/useGames';
import GlassCard from '../components/GlassCard';
import StatusPill from '../components/StatusPill';
import EmptyState from '../components/EmptyState';
import Sheet from '../components/Sheet';
import { seasonLeaderboard, formatPoints } from '../utils/scoring';

const DEFAULT_PLAYERS = ['Cheok', 'Cheng', 'Breydon', 'Ian', 'Jedd'];

function SeasonCard({ season, onLongPress, onDeleteRequest, onSetActive, activating }) {
  const { games } = useGames(season.id);
  const pressTimer = useRef(null);

  const handlePressStart = (event) => {
    if (!season.isActive) return;
    if (event.target.closest?.('button')) return;
    pressTimer.current = setTimeout(() => onLongPress(season), 500);
  };
  const handlePressEnd = () => clearTimeout(pressTimer.current);
  const stopCardPress = (event) => {
    event.stopPropagation();
    clearTimeout(pressTimer.current);
  };

  const fmt = (ts) => {
    if (!ts) return '?';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      onTouchStart={handlePressStart} onTouchEnd={handlePressEnd}
      onMouseDown={handlePressStart} onMouseLeave={handlePressEnd} onMouseUp={handlePressEnd}>
      <GlassCard tint={season.isActive ? 'gold' : undefined}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="card-title truncate">{season.name}</h2>
            <p className="secondary-text mt-1">{fmt(season.startDate)} - {fmt(season.endDate)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusPill active={season.isActive} />
            <button
              type="button"
              className="season-delete-button"
              aria-label={`Delete ${season.name}`}
              onPointerDown={stopCardPress}
              onMouseDown={stopCardPress}
              onTouchStart={stopCardPress}
              onClick={(event) => {
                stopCardPress(event);
                onDeleteRequest(season);
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="number-text text-lg font-bold text-white">{games.length}</p>
            <p className="section-label normal-case tracking-normal">games</p>
          </div>
          <div>
            <p className="number-text text-lg font-bold text-white">{(season.regularPlayers || []).length}</p>
            <p className="section-label normal-case tracking-normal">players</p>
          </div>
        </div>
        {!season.isActive && (
          <button
            type="button"
            className="season-select-button mt-4"
            disabled={activating}
            onPointerDown={stopCardPress}
            onMouseDown={stopCardPress}
            onTouchStart={stopCardPress}
            onClick={(event) => {
              stopCardPress(event);
              onSetActive(season);
            }}
          >
            <CircleDot size={15} />
            {activating ? 'Activating...' : 'Make Active Season'}
          </button>
        )}
      </GlassCard>
    </motion.div>
  );
}

function CreateSeasonModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [players, setPlayers] = useState([...DEFAULT_PLAYERS]);
  const [newPlayer, setNewPlayer] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const addInputRef = useRef(null);

  const normalizedPlayers = () => {
    const uniquePlayers = [];
    const seen = new Set();
    players.map(player => player.trim()).filter(Boolean).forEach(player => {
      const key = player.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniquePlayers.push(player);
      }
    });
    return uniquePlayers;
  };

  const addPlayer = () => {
    const player = newPlayer.trim();
    if (!player || players.length >= 8) return;
    if (players.some(existing => existing.toLowerCase() === player.toLowerCase())) {
      setNewPlayer('');
      return;
    }
    setPlayers(prev => [...prev, player]);
    setNewPlayer('');
    requestAnimationFrame(() => addInputRef.current?.focus());
  };

  const validate = () => {
    const nextErrors = {};
    const uniquePlayers = normalizedPlayers();
    if (!name.trim()) nextErrors.name = 'Season name is required';
    if (uniquePlayers.length < 2) nextErrors.players = 'Add at least 2 players';
    if (new Date(endDate) <= new Date(startDate)) nextErrors.duration = 'End date must be after start date';
    setErrors(nextErrors);
    return { valid: Object.keys(nextErrors).length === 0, uniquePlayers };
  };

  const handleCreate = () => {
    const { valid, uniquePlayers } = validate();
    if (!valid) return;

    setSaving(true);
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'seasons'));
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
          if (d.data().isActive) batch.update(d.ref, { isActive: false });
        });
        await batch.commit();
        await addDoc(collection(db, 'seasons'), {
          name: name.trim(),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          regularPlayers: uniquePlayers,
          isActive: true,
          createdAt: serverTimestamp(),
        });
        onCreated();
      } catch (e) {
        console.error(e);
        setSaving(false);
      }
    })();
  };

  return (
    <Sheet open title="New Season" onClose={onClose}>
      <div className="form-stack">
        <section>
          <label className="form-section-label">Season Name</label>
          <input value={name} onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
            autoFocus
            placeholder="Semester 1 2026"
            className="control" />
          {errors.name && <p className="inline-error">{errors.name}</p>}
        </section>

        <section>
          <label className="form-section-label">Duration</label>
          <div className="date-grid">
            <div className="date-field">
              <label className="form-section-label">Start</label>
              <input aria-label="Start date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="control" />
            </div>
            <div className="date-field">
              <label className="form-section-label">End</label>
              <input aria-label="End date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="control" />
            </div>
          </div>
          {errors.duration && <p className="inline-error">{errors.duration}</p>}
        </section>

        <section>
          <label className="form-section-label">Players</label>
          <div className="player-chip-wrap">
            {players.map((player) => (
              <div className="player-chip" key={player}>
                <span>{player}</span>
                <button type="button" className="remove" aria-label={`Remove ${player}`}
                  onClick={() => setPlayers(prev => prev.filter(p => p !== player))}>
                  ×
                </button>
              </div>
            ))}
          </div>
          {errors.players && <p className="inline-error">{errors.players}</p>}
          {players.length < 8 && (
            <div className="compact-add-row mt-3">
              <input ref={addInputRef} value={newPlayer}
                onChange={e => setNewPlayer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPlayer()}
                placeholder="Enter player name..."
                className="control" />
              <button type="button" onClick={addPlayer} disabled={!newPlayer.trim()}
                className="small-pill-button disabled:opacity-50">Add</button>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <button onClick={handleCreate} disabled={saving}
            className="primary-button disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Season'}
          </button>
          <button onClick={onClose} className="secondary-button">Cancel</button>
        </section>
      </div>
    </Sheet>
  );
}

function EndSeasonModal({ season, onClose, onConfirm }) {
  const { games } = useGames(season?.id);
  const [confirming, setConfirming] = useState(false);
  const standings = seasonLeaderboard(games || [], season?.regularPlayers || []).slice(0, 3);
  const handleConfirm = () => {
    setConfirming(true);
    onConfirm(season);
  };
  return (
    <Sheet open title="End Season?" subtitle={season.name} onClose={onClose}>
      <div className="space-y-4">
        {standings.length > 0 && (
          <div className="card bg-[#26262e]">
            <p className="section-label mb-3">Top standings</p>
            <div className="space-y-2">
              {standings.map((row, index) => (
                <div key={row.player} className="flex items-center justify-between gap-3">
                  <span className="number-text text-[#8E8E93]">#{index + 1}</span>
                  <span className="flex-1 truncate font-semibold">{row.player}</span>
                  <span className="number-text font-bold text-[#E8C96A]">{formatPoints(row.points)} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="secondary-text">This marks the season as ended and triggers the final champion/loser celebration.</p>
        <div className="space-y-3">
          <button onClick={handleConfirm} disabled={confirming}
            className="destructive-button disabled:opacity-50">
            {confirming ? 'Ending...' : 'End Season'}
          </button>
          <button onClick={onClose} className="secondary-button">Cancel</button>
        </div>
      </div>
    </Sheet>
  );
}

function DeleteSeasonModal({ season, onClose, onConfirm }) {
  const { games } = useGames(season?.id);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setError('');
    try {
      await onConfirm(season);
    } catch (e) {
      console.error(e);
      setError('Could not delete this season. Try again in a moment.');
      setDeleting(false);
    }
  };

  return (
    <Sheet open title="Delete Season?" subtitle={season.name} onClose={onClose}>
      <div className="space-y-4">
        <div className="card bg-[#26262e]">
          <p className="section-label mb-2">This will remove</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="number-text text-lg font-bold text-white">1</p>
              <p className="section-label normal-case tracking-normal">season</p>
            </div>
            <div>
              <p className="number-text text-lg font-bold text-white">{games.length}</p>
              <p className="section-label normal-case tracking-normal">games</p>
            </div>
          </div>
        </div>
        <p className="secondary-text">
          This permanently deletes the season and every logged game attached to it. Leaderboards, history, and stats for this season will disappear.
        </p>
        {error && <p className="inline-error">{error}</p>}
        <div className="space-y-3">
          <button onClick={handleDelete} disabled={deleting}
            className="destructive-button disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete Season'}
          </button>
          <button onClick={onClose} disabled={deleting} className="secondary-button disabled:opacity-50">Cancel</button>
        </div>
      </div>
    </Sheet>
  );
}

export default function SeasonsPage() {
  const { seasons, loading } = useSeasons();
  const [showCreate, setShowCreate] = useState(false);
  const [endingSeason, setEndingSeason] = useState(null);
  const [deletingSeason, setDeletingSeason] = useState(null);
  const [activatingSeasonId, setActivatingSeasonId] = useState(null);

  const handleEndSeason = async (season) => {
    await updateDoc(doc(db, 'seasons', season.id), { isActive: false });
    setEndingSeason(null);
  };

  const handleDeleteSeason = async (season) => {
    if (!season?.id) return;
    const gamesQuery = query(collection(db, 'games'), where('seasonId', '==', season.id));
    const gamesSnap = await getDocs(gamesQuery);
    const refsToDelete = [
      ...gamesSnap.docs.map(gameDoc => gameDoc.ref),
      doc(db, 'seasons', season.id),
    ];

    for (let index = 0; index < refsToDelete.length; index += 450) {
      const batch = writeBatch(db);
      refsToDelete.slice(index, index + 450).forEach(ref => batch.delete(ref));
      await batch.commit();
    }
    setDeletingSeason(null);
  };

  const handleSetActiveSeason = async (season) => {
    if (!season?.id || activatingSeasonId) return;
    setActivatingSeasonId(season.id);
    try {
      const snap = await getDocs(collection(db, 'seasons'));
      const batch = writeBatch(db);
      snap.docs.forEach(seasonDoc => {
        batch.update(seasonDoc.ref, { isActive: seasonDoc.id === season.id });
      });
      await batch.commit();
    } catch (activeError) {
      console.error(activeError);
    } finally {
      setActivatingSeasonId(null);
    }
  };

  if (loading) return (
    <div className="page">
      <div className="page-inner flex min-h-[60dvh] items-center justify-center">
        <div className="secondary-text">Loading seasons...</div>
      </div>
    </div>
  );

  return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="page-title">Seasons</h1>
          <button onClick={() => setShowCreate(true)}
            className="icon-button bg-[#E8C96A] text-[#0a0a0f]"
            aria-label="Create Season">
            <Plus size={22} />
          </button>
        </div>
      </header>

      <div className="page-inner">
        {(seasons || []).length === 0 ? (
          <EmptyState icon="🏆" title="No seasons yet"
            message="Create your first season to start tracking"
            action={
              <button onClick={() => setShowCreate(true)}
                className="primary-button mt-2 max-w-[240px]">
                Create Season
              </button>
            } />
        ) : (
          <div className="space-y-3">
            {(seasons || []).map((s, i) => (
              <motion.div key={s.id} transition={{ delay: i * 0.05 }}>
                <SeasonCard
                  season={s}
                  onLongPress={setEndingSeason}
                  onDeleteRequest={setDeletingSeason}
                  onSetActive={handleSetActiveSeason}
                  activating={activatingSeasonId === s.id}
                />
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showCreate && <CreateSeasonModal onClose={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />}
          {endingSeason && <EndSeasonModal season={endingSeason} onClose={() => setEndingSeason(null)} onConfirm={handleEndSeason} />}
          {deletingSeason && <DeleteSeasonModal season={deletingSeason} onClose={() => setDeletingSeason(null)} onConfirm={handleDeleteSeason} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
