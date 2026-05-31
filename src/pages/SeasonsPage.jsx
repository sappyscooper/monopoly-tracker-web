import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trophy } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useSeasons } from '../hooks/useSeasons';
import { useGames } from '../hooks/useGames';
import GlassCard from '../components/GlassCard';
import StatusPill from '../components/StatusPill';
import EmptyState from '../components/EmptyState';

const DEFAULT_PLAYERS = ['Cheok', 'Cheng', 'Breydon', 'Ian', 'Jedd'];

function SeasonCard({ season, onLongPress }) {
  const { games } = useGames(season.id);
  const pressTimer = useRef(null);

  const handleTouchStart = () => {
    pressTimer.current = setTimeout(() => onLongPress(season), 500);
  };
  const handleTouchEnd = () => clearTimeout(pressTimer.current);

  const fmt = (ts) => {
    if (!ts) return '?';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onMouseLeave={handleTouchEnd}
      onMouseUp={handleTouchEnd}>
      <GlassCard tint={season.isActive ? 'gold' : undefined} className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-white">{season.name}</h2>
            <p className="text-sm text-[#8E8E93] mt-0.5">{fmt(season.startDate)} – {fmt(season.endDate)}</p>
          </div>
          <StatusPill active={season.isActive} />
        </div>
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <p className="font-bold text-white font-mono">{games.length}</p>
            <p className="text-[#8E8E93] text-xs">games</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-white font-mono">{season.regularPlayers?.length || 0}</p>
            <p className="text-[#8E8E93] text-xs">players</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-white font-mono">{season.cameoWeight ?? 0.5}</p>
            <p className="text-[#8E8E93] text-xs">cameo wt</p>
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
    if (!name.trim() || players.filter(p => p.trim()).length === 0) return;
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
        regularPlayers: players.map(p => p.trim()).filter(Boolean),
        cameoWeight,
        isActive: true,
        createdAt: serverTimestamp(),
      });
      onCreated();
    } catch (e) { console.error(e); setSaving(false); }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col justify-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div className="relative bg-[#1c1c22] rounded-t-3xl p-6 max-h-[90dvh] overflow-y-auto"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">New Season</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-white/8"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#8E8E93] uppercase tracking-wider mb-1.5 block">Season Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-[#26262e] rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-[#E8C96A]/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#8E8E93] uppercase tracking-wider mb-1.5 block">Start</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-[#26262e] rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-[#E8C96A]/40" />
            </div>
            <div>
              <label className="text-xs text-[#8E8E93] uppercase tracking-wider mb-1.5 block">End</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full bg-[#26262e] rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-[#E8C96A]/40" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#8E8E93] uppercase tracking-wider mb-2 block">Players</label>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input value={p} onChange={e => setPlayers(prev => { const n=[...prev]; n[i]=e.target.value; return n; })}
                    className="flex-1 bg-[#26262e] rounded-xl px-4 py-2.5 text-white outline-none" />
                  <button onClick={() => setPlayers(prev => prev.filter((_, j) => j !== i))}
                    className="p-2.5 rounded-xl bg-[#E07B6A]/15 text-[#E07B6A]"><X size={16} /></button>
                </div>
              ))}
              {players.length < 8 && (
                <button onClick={() => setPlayers(prev => [...prev, ''])}
                  className="w-full py-2.5 rounded-xl bg-white/5 text-[#8E8E93] text-sm flex items-center justify-center gap-2">
                  <Plus size={16} /> Add Player
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs text-[#8E8E93] uppercase tracking-wider mb-2 block">
              Cameo Impact: <span className="text-[#E8C96A]">{cameoWeight.toFixed(2)}</span>
            </label>
            <input type="range" min="0" max="1" step="0.05" value={cameoWeight}
              onChange={e => setCameoWeight(parseFloat(e.target.value))}
              className="w-full accent-[#E8C96A]" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-white/8 text-white font-semibold">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !name.trim()}
              className="flex-1 py-3 rounded-2xl bg-[#E8C96A] text-black font-bold disabled:opacity-50">
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EndSeasonModal({ season, onClose, onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm(season);
  };
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div className="relative bg-[#1c1c22] rounded-3xl p-6 w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <h2 className="text-xl font-bold mb-2">End Season?</h2>
        <p className="text-[#8E8E93] text-sm mb-6">"{season.name}" will be marked as ended. This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-white/8 text-white font-semibold">Cancel</button>
          <button onClick={handleConfirm} disabled={confirming}
            className="flex-1 py-3 rounded-2xl bg-[#E07B6A] text-white font-bold disabled:opacity-50">
            {confirming ? 'Ending…' : 'End Season'}
          </button>
        </div>
      </motion.div>
    </motion.div>
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

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-[#8E8E93]">Loading…</div></div>;

  return (
    <div className="px-4 pt-14 pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Seasons</h1>
        <button onClick={() => setShowCreate(true)}
          className="p-2 rounded-full bg-[#E8C96A]/15 text-[#E8C96A]"
          style={{ WebkitTapHighlightColor: 'transparent' }}>
          <Plus size={22} />
        </button>
      </div>

      {seasons.length === 0 ? (
        <EmptyState icon="🏆" title="No seasons yet"
          message="Create your first season to get started"
          action={
            <button onClick={() => setShowCreate(true)}
              className="mt-2 px-6 py-3 rounded-2xl bg-[#E8C96A] text-black font-bold">
              Create Season
            </button>
          } />
      ) : (
        <div className="space-y-3">
          {seasons.map((s, i) => (
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
  );
}
