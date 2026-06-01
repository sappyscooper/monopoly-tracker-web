import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, TouchSensor
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { doc, deleteDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useActiveSeason } from '../hooks/useActiveSeason';
import { useGames } from '../hooks/useGames';
import { calculateGamePoints, formatPoints } from '../utils/scoring';
import {
  buildPlacementsFromEntries,
  canonicalParticipantName,
  collectCameoNames,
  gameDateInputValue,
  makeGameEntries,
  normalizeParticipantName,
} from '../utils/gameForm';
import { AbsentRow, PlayerRow } from '../components/GamePlacementRows';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import Sheet from '../components/Sheet';

function EditGameSheet({ game, season, games, onClose }) {
  const [gameDate, setGameDate] = useState(gameDateInputValue(game));
  const [entries, setEntries] = useState(() => makeGameEntries(season, game));
  const [cameoInput, setCameoInput] = useState('');
  const [saving, setSaving] = useState(false);
  const guestSuggestions = useMemo(() => collectCameoNames(games), [games]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const rankedEntries = entries.filter(entry => !entry.isAbsent);
  const activeRegulars = entries.filter(entry => !entry.isCameo && !entry.isAbsent);
  const absentRegulars = entries.filter(entry => !entry.isCameo && entry.isAbsent);
  const placements = buildPlacementsFromEntries(entries);
  const scores = calculateGamePoints(placements);
  const canSave = activeRegulars.length >= 2 && !saving;

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

  const addCameo = (name = cameoInput) => {
    const player = canonicalParticipantName(name, guestSuggestions);
    if (!player) return;
    const taken = entries.some(entry => normalizeParticipantName(entry.player) === normalizeParticipantName(player));
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
  };

  const removeCameo = (id) => setEntries(prev => prev.filter(entry => entry.id !== id));

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'games', game.id), {
        date: Timestamp.fromDate(new Date(`${gameDate}T12:00:00`)),
        placements,
        updatedAt: serverTimestamp(),
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open title="Edit Game" subtitle="Adjust the date, finishing order, absences, and guests." onClose={onClose}>
      <div className="form-stack">
        <section>
          <label className="form-section-label">Game Date</label>
          <input type="date" className="control" value={gameDate} onChange={event => setGameDate(event.target.value)} />
        </section>

        <section>
          <p className="section-label">Finishing Order</p>
          <p className="section-subtext">Drag regulars and guests together. Guests are skipped for points.</p>
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

        <section>
          <p className="section-label">Cameo Guests</p>
          <p className="section-subtext">Reuse a previous guest name to keep Stats grouped correctly.</p>
          <div className="mt-3">
            <div className="compact-add-row">
              <input
                value={cameoInput}
                onChange={event => setCameoInput(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && addCameo()}
                placeholder="+ Add Guest Name..."
                className="control"
              />
              <button onClick={() => addCameo()} disabled={!cameoInput.trim()} className="small-pill-button disabled:opacity-50">Add</button>
            </div>
            {guestSuggestions.length > 0 && (
              <div className="guest-suggestion-row">
                {guestSuggestions.map(name => {
                  const alreadyAdded = entries.some(entry => normalizeParticipantName(entry.player) === normalizeParticipantName(name));
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => addCameo(name)}
                      disabled={alreadyAdded}
                      className="guest-suggestion-chip"
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section>
          <p className="section-label mb-3">Score Preview</p>
          <GlassCard>
            {placements.map(placement => (
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

        <div className="space-y-3">
          <button onClick={handleSave} disabled={!canSave} className="primary-button disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={onClose} className="secondary-button">Cancel</button>
        </div>
      </div>
    </Sheet>
  );
}

function GameRow({ game, season, games }) {
  const [expanded, setExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteRevealed, setDeleteRevealed] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);

  const scores = calculateGamePoints(game.placements || []);
  const topPlayers = (game.placements || [])
    .filter(p => !p.isCameo)
    .sort((a, b) => a.placing - b.placing)
    .slice(0, 3)
    .map(p => p.player);

  const dateStr = game.date?.toDate ? game.date.toDate().toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short'
  }) : 'Unknown date';

  const handleDelete = async () => {
    await deleteDoc(doc(db, 'games', game.id));
    setDeleteConfirm(false);
    setDeleteRevealed(false);
  };

  const handleTouchMove = (event) => {
    if (touchStartX === null) return;
    const delta = event.touches[0].clientX - touchStartX;
    if (delta < -48) setDeleteRevealed(true);
    if (delta > 32) setDeleteRevealed(false);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <button
        className={`absolute bottom-0 right-0 top-0 z-0 w-24 bg-[#E07B6A] text-sm font-bold text-white transition-opacity ${deleteRevealed ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => setDeleteConfirm(true)}
        tabIndex={deleteRevealed ? 0 : -1}
      >
        Delete
      </button>
      <GlassCard className={`relative z-10 overflow-hidden transition-transform duration-200 ${deleteRevealed ? '-translate-x-24' : ''}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded(value => !value);
          }
        }}
        onTouchStart={event => setTouchStartX(event.touches[0].clientX)}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setTouchStartX(null)}
        className="w-full p-0 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-white">{dateStr}</p>
            <p className="text-sm text-[#8E8E93] truncate">
              {topPlayers.length ? topPlayers.map((p, i) => `${['🥇', '🥈', '🥉'][i] || ''} ${p}`).join('  ') : 'No placements'} · {(game.placements || []).length} players
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); setEditing(true); }}
              className="icon-button !min-h-9 !min-w-9 rounded-xl bg-[#6EB5D4]/15 text-[#6EB5D4]" aria-label="Edit game"><Pencil size={15} /></button>
            <button onClick={e => { e.stopPropagation(); setDeleteConfirm(true); }}
              className="icon-button !min-h-9 !min-w-9 rounded-xl bg-[#E07B6A]/15 text-[#E07B6A]" aria-label="Delete game"><Trash2 size={15} /></button>
            {expanded ? <ChevronUp size={18} className="text-[#8E8E93]" /> : <ChevronDown size={18} className="text-[#8E8E93]" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-white/8">
            <div className="p-4 space-y-2">
              {(game.placements || []).sort((a, b) => a.placing - b.placing).map(p => (
                <div key={p.player} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[#8E8E93] font-mono text-xs w-6">#{p.placing}</span>
                    <span className={`text-sm ${p.isCameo ? 'text-[#E8C96A]' : p.isAbsent ? 'text-[#8E8E93]' : 'text-white'}`}>
                      {p.player}
                    </span>
                    {p.isCameo && <span className="text-xs bg-[#E8C96A]/15 text-[#E8C96A] px-1.5 py-0.5 rounded">Guest</span>}
                    {p.isAbsent && <span className="text-xs bg-white/8 text-[#8E8E93] px-1.5 py-0.5 rounded">Absent</span>}
                  </div>
                  <span className="font-mono text-sm font-bold">
                    {p.isCameo ? '—' : `${formatPoints(scores[p.player] ?? 0)} pts`}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      </GlassCard>
      <Sheet open={deleteConfirm} title="Delete game?" subtitle="This removes the game from history and recalculates standings." onClose={() => setDeleteConfirm(false)}>
        <div className="space-y-3">
          <button onClick={handleDelete} className="destructive-button">Delete Game</button>
          <button onClick={() => setDeleteConfirm(false)} className="secondary-button">Cancel</button>
        </div>
      </Sheet>
      {editing && (
        <EditGameSheet
          game={game}
          season={season}
          games={games}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

export default function HistoryPage() {
  const { activeSeason: season } = useActiveSeason();
  const { games, loading } = useGames(season?.id);

  if (loading) return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="page-title">History</h1>
        </div>
      </header>
      <div className="page-inner flex min-h-[60dvh] items-center justify-center">
        <div className="secondary-text">Loading history…</div>
      </div>
    </div>
  );

  const grouped = {};
  (games || []).forEach(g => {
    const d = g.date?.toDate ? g.date.toDate() : new Date();
    const key = d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  });

  return (
    <div className="page">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="page-title">History</h1>
        </div>
      </header>
      <div className="page-inner">
      {(games || []).length === 0 ? (
        <EmptyState icon="🕐" title="No games yet" message="Head to the Log tab to play your first game." />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, monthGames]) => (
            <div key={month}>
              <p className="section-label mb-3">{month}</p>
              <div className="space-y-2">
                {monthGames.map(g => <GameRow key={g.id} game={g} season={season} games={games || []} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
