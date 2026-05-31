import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useSeasons } from '../hooks/useSeasons';
import { useGames } from '../hooks/useGames';
import GlassCard from '../components/GlassCard';
import StatusPill from '../components/StatusPill';
import EmptyState from '../components/EmptyState';
import Sheet from '../components/Sheet';
import { seasonLeaderboard, formatPoints } from '../utils/scoring';

const DEFAULT_PLAYERS = ['Cheok', 'Cheng', 'Breydon', 'Ian', 'Jedd'];

function SeasonCard({ season, onLongPress }) {
  const { games } = useGames(season.id);
  const pressTimer = useRef(null);

  const handlePressStart = () => {
    if (!season.isActive) return;
    pressTimer.current = setTimeout(() => onLongPress(season), 500);
  };
  const handlePressEnd = () => clearTimeout(pressTimer.current);

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
            <p className="secondary-text mt-1">{fmt(season.startDate)} – {fmt(season.endDate)}</p>
          </div>
          <StatusPill active={season.isActive} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="number-text text-lg font-bold text-white">{games.length}</p>
            <p className="section-label normal-case tracking-normal">games</p>
          </div>
          <div>
            <p className="number-text text-lg font-bold text-white">{(season.regularPlayers || []).length}</p>
            <p className="section-label normal-case tracking-normal">players</p>
          </div>
          <div>
            <p className="number-text text-lg font-bold text-white">{(season.cameoWeight ?? 0.5).toFixed(1)}×</p>
            <p className="section-label normal-case tracking-normal">cameo</p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function CreateSeasonModal({ onClose, onCreated }) {
  const [name, setName] = useState('Semester 1 2026');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [players, setPlayers] = useState([...DEFAULT_PLAYERS]);
  const [cameoWeight, setCameoWeight] = useState(0.5);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const uniquePlayers = [];
    const seen = new Set();
    players.map(p => p.trim()).filter(Boolean).forEach(player => {
      const key = player.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniquePlayers.push(player);
      }
    });
    if (!name.trim() || uniquePlayers.length === 0) return;
    setSaving(true);
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
        cameoWeight,
        isActive: true,
        createdAt: serverTimestamp(),
      });
      onCreated();
    } catch (e) { console.error(e); setSaving(false); }
  };

  return (
    <Sheet open title="Create Season" subtitle="Set up the group and cameo impact." onClose={onClose}>
      <div className="space-y-4">
          <div>
            <label className="section-label mb-2 block">Season name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              autoFocus
              placeholder="e.g. Semester 1 2026"
              className="control" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label mb-2 block">Start</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="control" />
            </div>
            <div>
              <label className="section-label mb-2 block">End</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="control" />
            </div>
          </div>
          <div>
            <label className="section-label mb-2 block">Players</label>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input value={p} onChange={e => setPlayers(prev => { const n=[...prev]; n[i]=e.target.value; return n; })}
                    placeholder={`Player ${i + 1}`}
                    className="control flex-1" />
                  <button onClick={() => setPlayers(prev => prev.filter((_, j) => j !== i))}
                    className="icon-button bg-[#E07B6A]/15 text-[#E07B6A]" aria-label={`Remove ${p || 'player'}`}><X size={17} /></button>
                </div>
              ))}
              {players.length < 8 && (
                <button onClick={() => setPlayers(prev => [...prev, ''])}
                  className="secondary-button !min-h-11 flex items-center justify-center gap-2 !text-sm">
                  <Plus size={16} /> Add Player
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="section-label mb-2 flex justify-between">
              <span>Cameo Impact</span>
              <span className="text-[#E8C96A]">{cameoWeight.toFixed(2)}×</span>
            </label>
            <input type="range" min="0" max="1" step="0.05" value={cameoWeight}
              onChange={e => setCameoWeight(parseFloat(e.target.value))}
              className="w-full accent-[#E8C96A]" />
          </div>
          <div className="space-y-3 pt-2">
            <button onClick={handleCreate} disabled={saving || !name.trim()}
              className="primary-button disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Season'}
            </button>
            <button onClick={onClose} className="secondary-button">Cancel</button>
          </div>
      </div>
    </Sheet>
  );
}

function EndSeasonModal({ season, onClose, onConfirm }) {
  const { games } = useGames(season?.id);
  const [confirming, setConfirming] = useState(false);
  const standings = seasonLeaderboard(games || [], season?.regularPlayers || [], season?.cameoWeight ?? 0.5).slice(0, 3);
  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm(season);
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
            {confirming ? 'Ending…' : 'End Season'}
          </button>
          <button onClick={onClose} className="secondary-button">Cancel</button>
        </div>
      </div>
    </Sheet>
  );
}

export default function SeasonsPage() {
  const { seasons, loading } = useSeasons();
  const [showCreate, setShowCreate] = useState(false);
  const [endingSeason, setEndingSeason] = useState(null);

  const handleEndSeason = async (season) => {
    await updateDoc(doc(db, 'seasons', season.id), { isActive: false });
    setEndingSeason(null);
  };

  if (loading) return (
    <div className="page">
      <div className="page-inner flex min-h-[60dvh] items-center justify-center">
        <div className="secondary-text">Loading seasons…</div>
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
              <SeasonCard season={s} onLongPress={setEndingSeason} />
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateSeasonModal onClose={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />}
        {endingSeason && <EndSeasonModal season={endingSeason} onClose={() => setEndingSeason(null)} onConfirm={handleEndSeason} />}
      </AnimatePresence>
      </div>
    </div>
  );
}
