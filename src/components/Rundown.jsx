import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import RundownItem from './RundownItem';
import { HOUR1_END, HOUR2_END, NEWS_DURATION, ITEM_TYPES, formatDuration, generateId } from '../utils';

const HourHeader = ({ label, usedSecs }) => {
  const max = 55 * 60;
  const remaining = max - usedSecs;
  const over = remaining < 0;
  const tight = !over && remaining < 5 * 60;
  const timeColor = over ? 'var(--red)' : tight ? 'var(--yellow)' : 'var(--text-muted)';
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      padding: '6px 0', marginBottom: 8, marginTop: 4,
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: '1rem', color: 'var(--text)' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Time used</span>
      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums', color: timeColor }}>
        {over
          ? `${formatDuration(Math.abs(remaining))} over`
          : `${formatDuration(remaining)} left`
        }
        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {formatDuration(usedSecs)} / 55:00</span>
      </span>
    </div>
  );
};

const TableHeader = () => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '20px 100px 1fr 72px 72px 46px 34px 38px 32px',
    gap: 5,
    padding: '0 8px 5px',
    marginBottom: 4,
  }}>
    {['', 'Segment', 'Title / Artist', 'Duration', 'Type', 'Danish', 'P6', 'Disk.', ''].map((col, i) => (
      <div key={i} style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {col}
      </div>
    ))}
  </div>
);

const NewsRow = ({ clockTime }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', margin: '14px 0',
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
    }}
    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
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

  // Split items into hour buckets by programming time
  let progTemp = 0;
  let clockTemp = 0;
  const hour1Rows = [];
  const hour2Rows = [];

  items.forEach((item, index) => {
    const row = { item, index, cumSecs: clockTemp };
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
  const news1ClockTime = h1Duration;
  const news2ClockTime = h1Duration + NEWS_DURATION + h2Duration;

  // Add news break offset to hour 2 timestamps
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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>

        {/* ── Hour 1 ── */}
        <HourHeader label="Hour 1" usedSecs={h1Duration} />
        <TableHeader />
        {hour1Rows.length === 0 && (
          <div style={{ padding: '14px 8px', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
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
        <AddItemButton onClick={() => onAdd(blankItem(), hour1Rows.length)} />

        {/* ── News break 1 ── */}
        <NewsRow clockTime={news1ClockTime} />

        {/* ── Hour 2 ── */}
        <HourHeader label="Hour 2" usedSecs={h2Duration} />
        <TableHeader />
        {hour2Rows.length === 0 && (
          <div style={{ padding: '14px 8px', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
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
        <AddItemButton onClick={() => onAdd(blankItem(), null)} />

        {/* ── News break 2 ── */}
        <NewsRow clockTime={news2ClockTime} />

      </SortableContext>
    </DndContext>
  );
}
