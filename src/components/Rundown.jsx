import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import RundownItem from './RundownItem';
import { HOUR1_END, NEWS_DURATION, ITEM_TYPES, formatDuration, generateId } from '../utils';

const HourHeader = ({ label, usedSecs }) => {
  const max = 55 * 60;
  const over = usedSecs > max;
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      marginBottom: 8, marginTop: 4,
    }}>
      <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: '1.05rem', color: 'var(--text)' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Time used</span>
      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums', color: over ? 'var(--red)' : 'var(--text-muted)' }}>
        {formatDuration(usedSecs)} / 55:00{over ? ' — OVER' : ''}
      </span>
    </div>
  );
};

const TableHeader = () => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '20px 100px 1fr 72px 72px 48px 36px 32px',
    gap: 6,
    padding: '0 10px 4px',
    borderBottom: '1px solid var(--border)',
    marginBottom: 6,
  }}>
    {['', 'Segment', 'Title / Artist', 'Duration', 'Type', 'Danish', 'P6', ''].map((col, i) => (
      <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {col}
      </div>
    ))}
  </div>
);

const NewsRow = ({ clockTime }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', margin: '12px 0',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        background: 'var(--accent2)', color: '#0e0e0e',
        fontSize: '0.68rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20,
        letterSpacing: '0.02em',
      }}>
        Nyheder
      </span>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
        Nyheder — 5:00 min (fast)
      </span>
    </div>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
      {formatDuration(clockTime)} → {formatDuration(clockTime + NEWS_DURATION)}
    </span>
  </div>
);

const AddItemButton = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%', marginTop: 6, padding: '8px',
      background: 'transparent',
      border: '1px dashed var(--border)',
      borderRadius: 6,
      color: 'var(--text-muted)',
      fontSize: '0.8rem',
      transition: 'color 0.15s, border-color 0.15s',
    }}
    onMouseEnter={e => { e.target.style.color = 'var(--text-dim)'; e.target.style.borderColor = 'var(--text-muted)'; }}
    onMouseLeave={e => { e.target.style.color = 'var(--text-muted)'; e.target.style.borderColor = 'var(--border)'; }}
  >
    + Add item
  </button>
);

export default function Rundown({ items, onReorder, onRemove, onUpdate, onAdd }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIdx = items.findIndex(i => i.id === active.id);
      const newIdx = items.findIndex(i => i.id === over.id);
      onReorder(arrayMove(items, oldIdx, newIdx));
    }
  };

  // Split items into hour 1 and hour 2 by programming time
  let progTemp = 0;
  let clockTemp = 0;
  const hour1Rows = [];
  const hour2Rows = [];

  items.forEach((item, index) => {
    const row = { item, index, cumSecs: clockTemp, isInHour1: progTemp < HOUR1_END };
    if (progTemp < HOUR1_END) {
      hour1Rows.push(row);
    } else {
      hour2Rows.push(row);
    }
    progTemp += item.duration || 0;
    clockTemp += item.duration || 0;
  });

  const h1Duration = hour1Rows.reduce((s, r) => s + (r.item.duration || 0), 0);
  const h2Duration = hour2Rows.reduce((s, r) => s + (r.item.duration || 0), 0);
  const newsClockTime = h1Duration;

  // Correct hour 2 clock times to include the news break offset
  hour2Rows.forEach(r => { r.cumSecs += NEWS_DURATION; });

  const blankItem = () => ({
    id: generateId(),
    type: ITEM_TYPES.SONG,
    segment: 'solo',
    title: '',
    artist: '',
    duration: 0,
    isDanish: false,
    isP6Beat: false,
    isGuest: false,
    diskoteketCleared: false,
    notes: '',
  });

  const addToHour1 = () => onAdd(blankItem(), hour1Rows.length);
  const addToHour2 = () => onAdd(blankItem(), null); // append to end

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>

        {/* Hour 1 */}
        <HourHeader label="Hour 1" usedSecs={h1Duration} />
        <TableHeader />
        {hour1Rows.length === 0 && (
          <div style={{ padding: '16px 10px', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
            No items yet
          </div>
        )}
        {hour1Rows.map(row => (
          <RundownItem
            key={row.item.id}
            item={row.item}
            index={row.index}
            cumSecs={row.cumSecs}
            isInHour1={true}
            onRemove={onRemove}
            onUpdate={onUpdate}
          />
        ))}
        <AddItemButton onClick={addToHour1} />

        {/* News break */}
        <NewsRow clockTime={newsClockTime} />

        {/* Hour 2 */}
        <HourHeader label="Hour 2" usedSecs={h2Duration} />
        <TableHeader />
        {hour2Rows.length === 0 && (
          <div style={{ padding: '16px 10px', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
            No items yet
          </div>
        )}
        {hour2Rows.map(row => (
          <RundownItem
            key={row.item.id}
            item={row.item}
            index={row.index}
            cumSecs={row.cumSecs}
            isInHour1={false}
            onRemove={onRemove}
            onUpdate={onUpdate}
          />
        ))}
        <AddItemButton onClick={addToHour2} />

      </SortableContext>
    </DndContext>
  );
}
