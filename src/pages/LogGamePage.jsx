import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, GripVertical, Star } from 'lucide-react';
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
import Sheet from '../components/Sheet';

function positionClass(placing) {
  if (placing === 1) return 'pos-1';
  if (placing === 2) return 'pos-2';
  if (placing === 3) return 'pos-3';
  return 'pos-other';
}

function DateSheet({ value, onChange, onClose }) {
  return (
    <Sheet open title="Game Date" onClose={onClose}>
      <div className="form-stack">
        <section>
          <label className="form-section-label">Date</label>
          <input type="date" className="control" value={value} onChange={event => onChange(event.target.value)} />
        </section>
        <button className="primary-button" onClick={onClose}>Done</button>
      </div>
    </Sheet>
  );
}

function PlayerRow({ entry, placing, onToggleAbsent, onRemoveCameo }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={`player-row ${entry.isCameo ? 'cameo' : ''} ${isDragging ? 'dragging' : ''}`}>
      <button {...attributes} {...listeners} className="drag-handle" aria-label={`Drag ${entry.player}`}>
        <GripVertical size={18} />
      </button>
      <div className={`pos-badge ${positionClass(placing)}`}>{placing}</div>
      <div className={`player-name ${entry.isCameo ? 'text-[#E8C96A]' : ''}`}>
        {entry.player}
        {entry.isCameo && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#E8C96A]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[#E8C96A]">
            <Star size={10} fill="currentColor" /> Guest
          </span>
        )}
      </div>
      {entry.isCameo ? (
        <button className="remove-cameo" onClick={() => onRemoveCameo(entry.id)} aria-label={`Remove ${entry.player}`}>×</button>
      ) : (
        <button onClick={() => onToggleAbsent(entry.id)} className="absent-toggle">Absent</button>
      )}
    </div>
  );
}

function AbsentRow({ entry, onToggleAbsent }) {
  return (
    <div className="player-row absent">
      <div className="drag-handle" aria-hidden="true" />
      <div className="pos-badge pos-absent">Last Place</div>
      <div className="player-name text-[#8E8E93]">{entry.player}</div>
      <button onClick={() => onToggleAbsent(entry.id)} className="absent-toggle active">Absent</button>
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
  const [showDateSheet, setShowDateSheet] = useState(false);
  const cameoInputRef = useRef(null);

  useEffect(() => {
    if (season) {
      setEntries((season.regularPlayers || []).map((player, index) => ({
        id: `regular-${index}-${player}`,
        player,
        isCameo: false,
        isAbsent: false,
      })));
    }
  }, [season?.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const rankedEntries = entries.filter(entry => !entry.isAbsent);
  const activeRegulars = entries.filter(entry => !entry.isCameo && !entry.isAbsent);
  const absentRegulars = entries.filter(entry => !entry.isCameo && entry.isAbsent);

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = rankedEntries.findIndex(entry => entry.id === active.id);
    const newIndex = rankedEntries.findIndex(entry => entry.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reorderedRanked = arrayMove(rankedEntries, oldIndex, newIndex);
    setEntries([...reorderedRanked, ...absentRegulars]);
  };

  const toggleAbsent = (id) => {
    setEntries(prev => {
      const target = prev.find(entry => entry.id === id);
      if (!target || target.isCameo) return prev;
      const rest = prev.filter(entry => entry.id !== id);
      const updated = { ...target, isAbsent: !target.isAbsent };
      const active = rest.filter(entry => !entry.isAbsent);
      const absent = rest.filter(entry => !entry.isCameo && entry.isAbsent);
      return updated.isAbsent ? [...active, ...absent, updated] : [...active, updated, ...absent];
    });
  };

  const addCameo = () => {
    const player = cameoInput.trim();
    if (!player) return;
    const taken = entries.some(entry => entry.player.toLowerCase() === player.toLowerCase());
    if (taken) {
      setCameoInput('');
      return;
    }
    setEntries(prev => [
      ...prev.filter(entry => !entry.isAbsent),
      { id: `cameo-${Date.now()}-${player}`, player, isCameo: true, isAbsent: false },
      ...prev.filter(entry => !entry.isCameo && entry.isAbsent),
    ]);
    setCameoInput('');
    requestAnimationFrame(() => cameoInputRef.current?.focus());
  };

  const removeCameo = (id) => setEntries(prev => prev.filter(entry => entry.id !== id));

  const buildPlacements = () => {
    const placements = [];
    let placing = 1;
    rankedEntries.forEach(entry => {
      placements.push({ player: entry.player, placing, isCameo: entry.isCameo, isAbsent: false });
      placing++;
    });
    absentRegulars.forEach(entry => {
      placements.push({ player: entry.player, placing, isCameo: false, isAbsent: true });
      placing++;
    });
    return placements;
  };

  const placements = buildPlacements();
  const scores = season ? calculateGamePoints(placements) : {};
  const canSubmit = activeRegulars.length >= 2 && !saving;

  const resetForm = () => {
    setEntries((season?.regularPlayers || []).map((player, index) => ({
      id: `regular-${index}-${player}-${Date.now()}`,
      player,
      isCameo: false,
      isAbsent: false,
    })));
    setCameoInput('');
  };

  const handleSave = async () => {
    if (!canSubmit || !season) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'games'), {
        seasonId: season.id,
        date: Timestamp.fromDate(new Date(`${gameDate}T12:00:00`)),
        placements,
        createdAt: serverTimestamp(),
      });
      resetForm();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = new Date(`${gameDate}T12:00:00`).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

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

  return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="page-title">Log Game</h1>
          <button className="log-date-button inline-flex items-center gap-2" onClick={() => setShowDateSheet(true)}>
            <span className="min-w-0 truncate">{formattedDate}</span>
            <CalendarDays size={15} />
          </button>
        </div>
      </header>

      <div className="page-inner">
        <section>
          <p className="section-label">Finishing Order</p>
          <p className="section-subtext">Drag regulars and guests together. Top = 1st place.</p>

          <div className="mt-3">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={rankedEntries.map(entry => entry.id)} strategy={verticalListSortingStrategy}>
                {rankedEntries.map((entry, index) => (
                  <PlayerRow
                    key={entry.id}
                    entry={entry}
                    placing={index + 1}
                    onToggleAbsent={toggleAbsent}
                    onRemoveCameo={removeCameo}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {absentRegulars.map(entry => (
              <AbsentRow key={entry.id} entry={entry} onToggleAbsent={toggleAbsent} />
            ))}
          </div>
        </section>

        <section className="mt-5">
          <p className="section-label">Cameo Guests</p>
          <p className="section-subtext">Point sliding is on: guests keep their place in history, but regular players slide up for points.</p>
          <div className="mt-3">
            <div className="compact-add-row">
              <input ref={cameoInputRef} value={cameoInput}
                onChange={event => setCameoInput(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && addCameo()}
                placeholder="+ Add Guest Name..."
                className="control" />
              <button onClick={addCameo} disabled={!cameoInput.trim()}
                className="small-pill-button disabled:opacity-50">Add</button>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <p className="section-label mb-3">Score Preview</p>
          <GlassCard>
            {placements.map((placement) => (
              <div key={`${placement.player}-${placement.placing}`} className="score-row">
                <div className="min-w-0">
                  <p className={`truncate text-sm font-medium ${placement.isCameo ? 'text-[#E8C96A]' : placement.isAbsent ? 'text-[#8E8E93]' : 'text-white'}`}>
                    {placement.player}
                  </p>
                  {placement.isAbsent && <p className="text-xs font-semibold text-[#E07B6A]">(absent - last place)</p>}
                </div>
                <div className="number-text shrink-0 text-right text-sm font-bold">
                  {placement.isCameo ? (
                    <span className="rounded-full bg-[#E8C96A]/15 px-2 py-1 text-xs text-[#E8C96A]">Guest</span>
                  ) : (
                    <span className={placement.isAbsent ? 'text-[#8E8E93]' : 'text-white'}>
                      {formatPoints(scores[placement.player] ?? 0)} pts
                    </span>
                  )}
                </div>
              </div>
            ))}
            {activeRegulars.length < 2 && (
              <p className="inline-error">Need at least 2 active regular players</p>
            )}
          </GlassCard>
        </section>

        <button onClick={handleSave} disabled={!canSubmit}
          className="primary-button sticky-save flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
          {saving ? 'Saving...' : 'Save Game'}
        </button>

        <AnimatePresence>
          {saved && (
            <motion.div className="toast" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}>
              Game saved ✓
            </motion.div>
          )}
          {showDateSheet && (
            <DateSheet value={gameDate} onChange={setGameDate} onClose={() => setShowDateSheet(false)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
