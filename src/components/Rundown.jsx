import React, { useState } from 'react';
import {
  DndContext, closestCorners, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import RundownItem from './RundownItem';
import { NEWS_DURATION, ITEM_TYPES, formatDuration, generateId } from '../utils';

const HourHeader = ({ label, usedSecs, accentColor }) => {
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
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 6,
      marginBottom: 8,
    }}>
      <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 500, fontSize: '0.95rem', color: 'var(--text)' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 2 }}>Time used</span>
      <span style={{ marginLeft: 'auto', fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums', color: timeColor, fontWeight: 500 }}>
        {over ? `${formatDuration(Math.abs(remaining))} OVER` : `${formatDuration(remaining)} left`}
        <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> · {formatDuration(usedSecs)} / 55:00</span>
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
      <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
        {col}
      </div>
    ))}
  </div>
);

const NewsRow = ({ clockTime }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '9px 14px',
    background: 'rgba(201,169,110,0.09)',
    border: '1px solid rgba(201,169,110,0.28)',
    borderRadius: 6,
    margin: '10px 0',
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
      width: '100%', marginTop: 6, padding: '7px',
      background: 'transparent',
      border: '1px dashed var(--border)',
      borderRadius: 6,
      color: 'var(--text-muted)',
      fontSize: '0.8rem',
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent2)'; e.currentTarget.style.color = 'var(--accent2)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
  >
    + Add item
  </button>
);

function DroppableZone({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 50,
        borderRadius: 6,
        transition: 'background 0.15s',
        background: isOver ? 'rgba(201,169,110,0.06)' : 'transparent',
      }}
    >
      {children}
    </div>
  );
}

export default function Rundown({ items, onReorder, onRemove, onUpdate, onAdd }) {
  const [activeItem, setActiveItem] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const h1Items = items.filter(i => (i.hour || 1) === 1);
  const h2Items = items.filter(i => (i.hour || 1) === 2);

  const h1Duration = h1Items.reduce((s, i) => s + (i.duration || 0), 0);
  const h2Duration = h2Items.reduce((s, i) => s + (i.duration || 0), 0);

  const h1CumSecs = h1Items.map((_, idx) =>
    h1Items.slice(0, idx).reduce((s, i) => s + (i.duration || 0), 0)
  );
  const h2CumSecs = h2Items.map((_, idx) =>
    h1Duration + NEWS_DURATION + h2Items.slice(0, idx).reduce((s, i) => s + (i.duration || 0), 0)
  );

  const handleDragStart = ({ active }) => {
    setActiveItem(items.find(i => i.id === active.id) || null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveItem(null);
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const draggedItem = items.find(i => i.id === activeId);
    if (!draggedItem) return;

    const sourceHour = draggedItem.hour || 1;

    let targetHour;
    if (overId === 'zone-hour1') targetHour = 1;
    else if (overId === 'zone-hour2') targetHour = 2;
    else {
      const overItem = items.find(i => i.id === overId);
      targetHour = overItem ? (overItem.hour || 1) : sourceHour;
    }

    if (sourceHour === targetHour) {
      const hourItems = sourceHour === 1 ? [...h1Items] : [...h2Items];
      const otherItems = sourceHour === 1 ? h2Items : h1Items;
      const oldIdx = hourItems.findIndex(i => i.id === activeId);
      const newIdx = hourItems.findIndex(i => i.id === overId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const reordered = arrayMove(hourItems, oldIdx, newIdx);
      onReorder(sourceHour === 1 ? [...reordered, ...otherItems] : [...otherItems, ...reordered]);
    } else {
      const updatedDragged = { ...draggedItem, hour: targetHour };
      const newH1 = h1Items.filter(i => i.id !== activeId);
      const newH2 = h2Items.filter(i => i.id !== activeId);

      if (targetHour === 1) {
        const insertIdx = newH1.findIndex(i => i.id === overId);
        const idx = insertIdx === -1 ? newH1.length : insertIdx;
        const finalH1 = [...newH1.slice(0, idx), updatedDragged, ...newH1.slice(idx)];
        onReorder([...finalH1, ...newH2]);
      } else {
        const insertIdx = newH2.findIndex(i => i.id === overId);
        const idx = insertIdx === -1 ? newH2.length : insertIdx;
        const finalH2 = [...newH2.slice(0, idx), updatedDragged, ...newH2.slice(idx)];
        onReorder([...newH1, ...finalH2]);
      }
    }
  };

  const blankItem = (hour = 1) => ({
    id: generateId(),
    type: ITEM_TYPES.SONG,
    segment: 'solo',
    title: '', artist: '', duration: 0,
    isDanish: false, isP6Beat: false, isGuest: false,
    diskoteketCleared: false, notes: '',
    hour,
  });

  const news1ClockTime = h1Duration;
  const news2ClockTime = h1Duration + NEWS_DURATION + h2Duration;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Hour 1 — blue tint */}
      <div style={{
        background: 'rgba(110, 155, 201, 0.05)',
        border: '1px solid rgba(110, 155, 201, 0.18)',
        borderRadius: 8,
        padding: '12px 12px 10px',
        marginBottom: 10,
      }}>
        <HourHeader label="Hour 1" usedSecs={h1Duration} accentColor="var(--blue)" />
        <TableHeader />
        <SortableContext items={h1Items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <DroppableZone id="zone-hour1">
            {h1Items.length === 0 && (
              <div style={{ padding: '16px 8px', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                No items yet — add below or drag from Hour 2
              </div>
            )}
            {h1Items.map((item, idx) => (
              <RundownItem
                key={item.id} item={item} index={idx}
                cumSecs={h1CumSecs[idx]}
                onRemove={onRemove} onUpdate={onUpdate}
              />
            ))}
          </DroppableZone>
        </SortableContext>
        <AddItemButton onClick={() => onAdd(blankItem(1))} />
      </div>

      <NewsRow clockTime={news1ClockTime} />

      {/* Hour 2 — green tint */}
      <div style={{
        background: 'rgba(109, 184, 138, 0.05)',
        border: '1px solid rgba(109, 184, 138, 0.18)',
        borderRadius: 8,
        padding: '12px 12px 10px',
        marginBottom: 10,
      }}>
        <HourHeader label="Hour 2" usedSecs={h2Duration} accentColor="var(--green)" />
        <TableHeader />
        <SortableContext items={h2Items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <DroppableZone id="zone-hour2">
            {h2Items.length === 0 && (
              <div style={{ padding: '16px 8px', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                No items yet — drag one down from Hour 1 or add below
              </div>
            )}
            {h2Items.map((item, idx) => (
              <RundownItem
                key={item.id} item={item} index={idx}
                cumSecs={h2CumSecs[idx]}
                onRemove={onRemove} onUpdate={onUpdate}
              />
            ))}
          </DroppableZone>
        </SortableContext>
        <AddItemButton onClick={() => onAdd(blankItem(2))} />
      </div>

      <NewsRow clockTime={news2ClockTime} />

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
