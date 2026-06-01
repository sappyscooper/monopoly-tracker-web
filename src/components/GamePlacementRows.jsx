import { GripVertical, Star } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function positionClass(placing) {
  if (placing === 1) return 'pos-1';
  if (placing === 2) return 'pos-2';
  if (placing === 3) return 'pos-3';
  return 'pos-other';
}

export function PlayerRow({ entry, placing, onToggleAbsent, onRemoveCameo }) {
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
        <button className="remove-cameo" onClick={() => onRemoveCameo(entry.id)} aria-label={`Remove ${entry.player}`}>x</button>
      ) : (
        <button onClick={() => onToggleAbsent(entry.id)} className="absent-toggle">Absent</button>
      )}
    </div>
  );
}

export function AbsentRow({ entry, onToggleAbsent }) {
  return (
    <div className="player-row absent">
      <div className="drag-handle" aria-hidden="true" />
      <div className="pos-badge pos-absent">Last Place</div>
      <div className="player-name text-[#8E8E93]">{entry.player}</div>
      <button onClick={() => onToggleAbsent(entry.id)} className="absent-toggle active">Absent</button>
    </div>
  );
}
