import React, { useState } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import RundownItem from './RundownItem';
import { HOUR1_END, NEWS_DURATION, ITEM_TYPES, formatDuration, generateId } from '../utils';

const HourHeader = ({ label, usedSecs }) => {
  const remaining = 55 * 60 - usedSecs;
  const over = remaining < 0;
  const tight = !over && remaining < 5 * 60;
  const timeColor = over ? 'var(--red)' : tight ? 'var(--yellow)' : 'var(--green)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px',
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      marginBottom: 8,
    }}>
      <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: '0.95rem', color: 'var(--text)' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 2 }}>Time used</span>
      <span style={{ marginLeft: 'auto', fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums', color: timeColor, fontWeight: 500 }}>
        {over ? `${formatDuration(Math.abs(remaining))} OVER` : `${formatDuration(remaining)} left`}
        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {formatDuration(usedSecs)} / 55:00</span>
      </span>
    </div>
  );
};

const TableHeader = () => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '16px 82px 1fr 78px 70px 44px 32px 36px 28px',
    gap: 5,
    padding: '0 8px 4px 8px',
    marginBottom: 3,
  }}>
    {['', 'Segment', 'Title / Artist', 'Duration', 'Type', 'Danish', 'P6', 'Disk.', ''].map((col, i) => (
      <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
        {col}
      </div>
    ))}
  </div>
);

const NewsRow = ({ clockTime }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '9px 14px',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        background: 'var(--accent2)', color: '#0e0e0e',
        fontSize: '0.68rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20,
      }}>Nyheder</span>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Nyheder — 5:00 min (fast)</span>
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
      width: '100%', marginTop: 5, padding: '7px',
      background: 'var(--surface2)',
      border: '1px dashed var(--border)',
      borderRadius: 6,
      color: 'var(--text-dim)',
      fontSize: '0.8rem',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent2)'; e.currentTarget.style.color = 'var(--accent2)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
  >
    + Add item
  </button>
);

export default function Rundown({ items, onReorder, onRemove, onUpdate, onAdd }) {
  const [activeItem, setActiveItem] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event) => {
    setActiveItem(items.find(i => i.id === event.active.id) || null);
  };

  const handleDragEnd = (event) => {
    setActiveItem(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = items.findIndex(i => i.id === active.id);
      const newIdx = items.findIndex(i => i.id === over.id);
      onReorder(arrayMove(items, oldIdx, newIdx));
    }
  };

  const isDragging = !!activeItem;

  // Split items into hour buckets
  let progTemp = 0;
  let clockTemp = 0;
  const hour1Rows = [];
  const hour2Rows = [];

  items.forEach((item, index) => {
    const row = { item, index, cumSecs: clockTemp };
    if (progTemp < HOUR1_END) hour1Rows.push(row);
    else hour2Rows.push(row);
    progTemp += item.duration || 0;
    clockTemp += item.duration || 0;
  });

  const h1Duration = hour1Rows.reduce((s, r) => s + (r.item.duration || 0), 0);
  const h2Duration = hour2Rows.reduce((s, r) => s + (r.item.duration || 0), 0);
  hour2Rows.forEach(r => { r.cumSecs += NEWS_DURATION; });

  const news1ClockTime = h1Duration;
  const news2ClockTime = h1Duration + NEWS_DURATION + h2Duration;

  const blankItem = () => ({
    id: generateId(), type: ITEM_TYPES.SONG, segment: 'solo',
    title: '', artist: '', duration: 0,
    isDanish: false, isP6Beat: false, isGuest: false,
    diskoteketCleared: false, notes: '',
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>

        {/* ── Hour 1 ── */}
        <HourHeader label="Hour 1" usedSecs={h1Duration} />
        <TableHeader />
        {hour1Rows.length === 0 && !isDragging && (
          <div style={{ padding: '12px 8px', color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic' }}>
            No items yet
          </div>
        )}
        {hour1Rows.map(row => (
          <RundownItem key={row.item.id} item={row.item} index={row.index}
            cumSecs={row.cumSecs} isInHour1={true} onRemove={onRemove} onUpdate={onUpdate} />
        ))}

        {/* Between-hours zone — collapses when dragging so cross-hour drop is easy */}
        <div style={{
          transition: 'margin 0.15s',
          margin: isDragging ? '4px 0' : '6px 0',
        }}>
          {!isDragging && <AddItemButton onClick={() => onAdd(blankItem(), hour1Rows.length)} />}

          <div style={{
            margin: isDragging ? '4px 0' : '12px 0',
            transition: 'margin 0.15s',
          }}>
            {isDragging ? (
              // Compact drop-zone hint while dragging
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '6px',
                background: 'rgba(201,169,110,0.08)',
                border: '1px dashed var(--accent2)',
                borderRadius: 6,
                fontSize: '0.72rem',
                color: 'var(--accent2)',
                opacity: 0.7,
              }}>
                ↕ drag across to change hour
              </div>
            ) : (
              <NewsRow clockTime={news1ClockTime} />
            )}
          </div>

          {!isDragging && (
            <>
              <HourHeader label="Hour 2" usedSecs={h2Duration} />
              <TableHeader />
            </>
          )}
        </div>

        {isDragging && (
          // Show minimal Hour 2 label while dragging
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '2px 4px', marginBottom: 4 }}>
            Hour 2
          </div>
        )}

        {hour2Rows.length === 0 && !isDragging && (
          <div style={{ padding: '12px 8px', color: 'var(--text-dim)', fontSize: '0.8rem', fontStyle: 'italic' }}>
            No items yet — drag one down from Hour 1 or add below
          </div>
        )}
        {hour2Rows.map(row => (
          <RundownItem key={row.item.id} item={row.item} index={row.index}
            cumSecs={row.cumSecs} isInHour1={false} onRemove={onRemove} onUpdate={onUpdate} />
        ))}

        {!isDragging && <AddItemButton onClick={() => onAdd(blankItem(), null)} />}

        {!isDragging && (
          <div style={{ margin: '12px 0' }}>
            <NewsRow clockTime={news2ClockTime} />
          </div>
        )}

      </SortableContext>

      {/* Drag overlay — ghost card following cursor */}
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div style={{
            padding: '7px 14px',
            background: 'var(--surface2)',
            border: '1px solid var(--accent2)',
            borderRadius: 6,
            fontSize: '0.82rem',
            color: 'var(--text)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'grabbing',
          }}>
            <span style={{ color: 'var(--accent2)' }}>⠿</span>
            <span>
              {activeItem.type === ITEM_TYPES.SONG
                ? `${activeItem.title || 'Untitled'}${activeItem.artist ? ' — ' + activeItem.artist : ''}`
                : `Speak${activeItem.notes ? ': ' + activeItem.notes : ''}`}
            </span>
            {activeItem.duration > 0 && (
              <span style={{ color: 'var(--accent2)', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                {formatDuration(activeItem.duration)}
              </span>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
