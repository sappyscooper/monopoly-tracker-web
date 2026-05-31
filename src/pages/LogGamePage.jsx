import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GripVertical, X } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, TouchSensor
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useActiveSeason } from '../hooks/useActiveSeason';
import { calculateGamePoints, formatPoints } from '../utils/scoring';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import { Link } from 'react-router-dom';

function SortableRow({ entry, placing, onToggleAbsent, onRemoveCameo }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style}
      className={`card flex items-center gap-3 !p-3 ${
        entry.isCameo ? '!border-[#E8C96A]/25 !bg-[#E8C96A]/10' :
        entry.isAbsent ? 'opacity-55' : '!bg-[#26262e]'
      }`}>
      {!entry.isAbsent && (
        <button {...attributes} {...listeners} className="grid min-h-11 min-w-11 place-items-center text-[#8E8E93] touch-none" aria-label={`Drag ${entry.player}`}>
          <GripVertical size={18} />
        </button>
      )}
      {entry.isAbsent && <div className="min-w-11" />}
      <div className={`number-text grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
        placing === 1 && !entry.isAbsent ? 'bg-[#E8C96A] text-black' : 'bg-white/8 text-[#8E8E93]'
      }`}>
        {placing}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`card-title truncate ${entry.isAbsent ? 'text-[#8E8E93]' : ''}`}>{entry.player}</p>
        {entry.isAbsent && <p className="text-xs font-semibold text-[#E07B6A]">Last Place</p>}
        {entry.isCameo && <p className="text-xs font-semibold text-[#E8C96A]">Guest</p>}
      </div>
      {!entry.isCameo && !entry.isAbsent && (
        <button onClick={() => onToggleAbsent(entry.id)}
          className="min-h-9 rounded-full bg-white/8 px-3 text-xs font-semibold text-[#8E8E93]">Absent</button>
      )}
      {!entry.isCameo && entry.isAbsent && (
        <button onClick={() => onToggleAbsent(entry.id)}
          className="min-h-9 rounded-full bg-[#6EB5D4]/15 px-3 text-xs font-semibold text-[#6EB5D4]">Undo</button>
      )}
      {entry.isCameo && (
        <button onClick={() => onRemoveCameo(entry.id)}
          className="icon-button !min-h-9 !min-w-9 rounded-xl bg-white/8 text-[#8E8E93]" aria-label={`Remove ${entry.player}`}><X size={14} /></button>
      )}
    </div>
  );
}

export default function LogGamePage() {
  const { activeSeason: season } = useActiveSeason();
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState([]);
  const [cameoInput, setCameoInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (season) {
      setEntries(season.regularPlayers.map((p, i) => ({
        id: `regular-${i}`, player: p, isCameo: false, isAbsent: false
      })));
    }
  }, [season?.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setEntries(prev => {
      const oldIdx = prev.findIndex(e => e.id === active.id);
      const newIdx = prev.findIndex(e => e.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  };

  const toggleAbsent = (id) => setEntries(prev => prev.map(e => e.id === id ? { ...e, isAbsent: !e.isAbsent } : e));
  const removeCameo = (id) => setEntries(prev => prev.filter(e => e.id !== id));

  const addCameo = () => {
    const name = cameoInput.trim();
    if (!name) return;
    if (entries.some(e => e.player.toLowerCase() === name.toLowerCase())) { setCameoInput(''); return; }
    setEntries(prev => [...prev, { id: `cameo-${Date.now()}`, player: name, isCameo: true, isAbsent: false }]);
    setCameoInput('');
  };

  const buildPlacements = () => {
    const nonAbsent = entries.filter(e => !e.isAbsent);
    const absentRegulars = entries.filter(e => e.isAbsent && !e.isCameo);
    const placements = [];
    let placing = 1;
    nonAbsent.forEach(e => {
      placements.push({ player: e.player, placing, isCameo: e.isCameo, isAbsent: false });
      placing++;
    });
    absentRegulars.forEach(e => {
      placements.push({ player: e.player, placing, isCameo: false, isAbsent: true });
      placing++;
    });
    return placements;
  };

  const placements = buildPlacements();
  const scores = season ? calculateGamePoints(placements, season.cameoWeight ?? 0.5) : {};

  const activeRegulars = entries.filter(e => !e.isCameo && !e.isAbsent);
  const canSubmit = activeRegulars.length >= 2 && !saving;

  const handleSave = async () => {
    if (!canSubmit || !season) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'games'), {
        seasonId: season.id,
        date: Timestamp.fromDate(new Date(gameDate)),
        placements,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setEntries(season.regularPlayers.map((p, i) => ({
        id: `regular-${i}-${Date.now()}`, player: p, isCameo: false, isAbsent: false
      })));
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (!season) return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="page-title">Log Game</h1>
        </div>
      </header>
      <div className="page-inner">
      <EmptyState icon="📋" title="No active season"
        message="Create an active season before logging a game."
        action={<Link to="/seasons" className="primary-button mt-2 inline-flex max-w-[240px] items-center justify-center">Go to Seasons</Link>} />
      </div>
    </div>
  );

  const sortableEntries = entries.filter(e => !e.isAbsent);
  const absentEntries = entries.filter(e => e.isAbsent);

  return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
        <h1 className="page-title">Log Game</h1>
        <input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)}
          className="control max-w-[168px] !min-h-11 !py-2" />
        </div>
      </header>

      <div className="page-inner">
      <p className="section-label mb-3">Finishing Order</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableEntries.map(e => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sortableEntries.map((entry, i) => (
              <SortableRow key={entry.id} entry={entry} placing={i + 1} onToggleAbsent={toggleAbsent} onRemoveCameo={removeCameo} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {absentEntries.length > 0 && (
        <div className="mt-2 space-y-2">
          {absentEntries.map((entry, i) => (
            <SortableRow
              key={entry.id}
              entry={entry}
              placing={sortableEntries.length + i + 1}
              onToggleAbsent={toggleAbsent}
              onRemoveCameo={removeCameo}
            />
          ))}
        </div>
      )}

      <div className="card mt-4 flex gap-2 !border-dashed !bg-transparent">
        <input value={cameoInput} onChange={e => setCameoInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCameo()}
          placeholder="Guest name..."
          className="control flex-1" />
        <button onClick={addCameo} disabled={!cameoInput.trim()}
          className="primary-button !min-h-[46px] !w-auto !px-4 disabled:opacity-40">
          Add
        </button>
      </div>

      <GlassCard className="mt-4">
        <p className="section-label mb-3">Points Preview</p>
        <div className="space-y-2">
          {placements.map(p => (
            <div key={p.player} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${p.isAbsent ? 'text-[#8E8E93]' : 'text-white'}`}>{p.player}</span>
                {p.isAbsent && <span className="text-xs text-[#8E8E93]">(absent)</span>}
                {p.isCameo && <span className="text-xs text-[#E8C96A]">(guest)</span>}
              </div>
              <span className={`font-mono font-bold text-sm ${p.isAbsent ? 'text-[#8E8E93]' : 'text-white'}`}>
                {p.isCameo ? 'Guest' : `${formatPoints(scores[p.player] ?? 0)} pts`}
              </span>
            </div>
          ))}
        </div>
        {activeRegulars.length < 2 && (
          <p className="text-xs text-[#E07B6A] mt-3">Need at least 2 active regular players</p>
        )}
      </GlassCard>

      <button onClick={handleSave} disabled={!canSubmit}
        className="primary-button mt-4 flex items-center justify-center gap-2 disabled:opacity-40">
        {saving ? 'Saving…' : 'Save Game'}
      </button>
      <AnimatePresence>
        {saved && (
          <motion.div className="toast" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}>
            Game saved ✓
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
