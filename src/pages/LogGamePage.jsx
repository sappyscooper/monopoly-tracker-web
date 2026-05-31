import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, X, Plus, Check } from 'lucide-react';
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

function SortableRow({ entry, onToggleAbsent, onRemoveCameo }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-3 p-3 rounded-2xl ${
        entry.isCameo ? 'bg-[#E8C96A]/8 ring-1 ring-[#E8C96A]/20' :
        entry.isAbsent ? 'bg-white/3 opacity-50' : 'bg-[#26262e]'
      }`}>
      {!entry.isAbsent && (
        <div {...attributes} {...listeners} className="text-[#8E8E93] cursor-grab active:cursor-grabbing touch-none">
          <GripVertical size={18} />
        </div>
      )}
      {entry.isAbsent && <div className="w-[18px]" />}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{entry.player}</p>
        {entry.isAbsent && <p className="text-xs text-[#8E8E93]">Last place (absent)</p>}
        {entry.isCameo && <p className="text-xs text-[#E8C96A]">Guest</p>}
      </div>
      {!entry.isCameo && !entry.isAbsent && (
        <button onClick={() => onToggleAbsent(entry.id)}
          className="text-xs px-2 py-1 rounded-lg bg-white/8 text-[#8E8E93]">Absent</button>
      )}
      {!entry.isCameo && entry.isAbsent && (
        <button onClick={() => onToggleAbsent(entry.id)}
          className="text-xs px-2 py-1 rounded-lg bg-[#6EB5D4]/15 text-[#6EB5D4]">Undo</button>
      )}
      {entry.isCameo && (
        <button onClick={() => onRemoveCameo(entry.id)}
          className="p-1.5 rounded-lg bg-white/8 text-[#8E8E93]"><X size={14} /></button>
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
    <div className="px-4 pt-14">
      <EmptyState icon="📋" title="No active season"
        message="Create an active season before logging a game."
        action={<Link to="/seasons" className="mt-2 px-6 py-3 rounded-2xl bg-[#E8C96A] text-black font-bold inline-block">Go to Seasons</Link>} />
    </div>
  );

  const sortableEntries = entries.filter(e => !e.isAbsent);
  const absentEntries = entries.filter(e => e.isAbsent);

  return (
    <div className="px-4 pt-14 pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Log Game</h1>
        <input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)}
          className="bg-[#26262e] text-white text-sm rounded-xl px-3 py-2 outline-none" />
      </div>

      <p className="text-xs text-[#8E8E93] mb-3 uppercase tracking-wider">Drag to set finishing order</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableEntries.map(e => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sortableEntries.map((entry, i) => (
              <div key={entry.id} className="relative">
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center
                  text-xs font-bold z-10 bg-[#0a0a0f] text-[#E8C96A] border border-[#E8C96A]/30">
                  {i + 1}
                </div>
                <div className="ml-6">
                  <SortableRow entry={entry} onToggleAbsent={toggleAbsent} onRemoveCameo={removeCameo} />
                </div>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {absentEntries.length > 0 && (
        <div className="mt-2 space-y-2">
          {absentEntries.map(entry => (
            <div key={entry.id} className="ml-6">
              <SortableRow entry={entry} onToggleAbsent={toggleAbsent} onRemoveCameo={removeCameo} />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <input value={cameoInput} onChange={e => setCameoInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCameo()}
          placeholder="Add guest player…"
          className="flex-1 bg-[#26262e] rounded-xl px-4 py-3 text-white text-sm outline-none" />
        <button onClick={addCameo} disabled={!cameoInput.trim()}
          className="p-3 rounded-xl bg-[#E8C96A]/15 text-[#E8C96A] disabled:opacity-40">
          <Plus size={20} />
        </button>
      </div>

      <GlassCard className="mt-4 p-4">
        <p className="text-xs text-[#8E8E93] uppercase tracking-wider mb-3">Points Preview</p>
        <div className="space-y-2">
          {placements.map(p => (
            <div key={p.player} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${p.isAbsent ? 'text-[#8E8E93]' : 'text-white'}`}>{p.player}</span>
                {p.isAbsent && <span className="text-xs text-[#8E8E93]">(absent)</span>}
                {p.isCameo && <span className="text-xs text-[#E8C96A]">(guest)</span>}
              </div>
              <span className={`font-mono font-bold text-sm ${p.isAbsent ? 'text-[#8E8E93]' : 'text-white'}`}>
                {p.isCameo ? 'Guest' : formatPoints(scores[p.player] ?? 0)}
              </span>
            </div>
          ))}
        </div>
        {activeRegulars.length < 2 && (
          <p className="text-xs text-[#E07B6A] mt-3">Need at least 2 active regular players</p>
        )}
      </GlassCard>

      <button onClick={handleSave} disabled={!canSubmit}
        className="w-full mt-4 py-4 rounded-2xl bg-[#E8C96A] text-black font-bold text-base disabled:opacity-40 flex items-center justify-center gap-2">
        {saving ? 'Saving…' : saved ? <><Check size={18} /> Saved!</> : 'Save Game'}
      </button>
    </div>
  );
}
