import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import RundownItem from './RundownItem';
import { ITEM_TYPES, HOUR1_END, formatDuration } from '../utils';

const NewsBreak = ({ label }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0', padding: '8px 14px',
    background: 'repeating-linear-gradient(45deg, var(--surface2), var(--surface2) 4px, var(--bg) 4px, var(--bg) 12px)',
    borderRadius: 5, border: '1px dashed var(--border)',
  }}>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>📰 {label} — 5 min (auto)</span>
  </div>
);

export default function Rundown({ items, onReorder, onRemove, onUpdate }) {
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

  // Build display rows with news break inserted where cumulative time crosses 55:00
  let cumSecs = 0;
  let newsInserted = false;
  const rows = [];

  items.forEach((item, index) => {
    const itemStart = cumSecs;
    const itemEnd = cumSecs + (item.duration || 0);

    // Insert news break when we cross 55:00
    if (!newsInserted && itemStart >= HOUR1_END) {
      rows.push({ type: 'news', key: 'news-break', label: 'News Break — end of hour 1' });
      newsInserted = true;
    }

    rows.push({
      type: 'item',
      item,
      index,
      cumSecs: itemStart,
      isInHour1: itemStart < HOUR1_END,
    });

    cumSecs = itemEnd;
  });

  if (!newsInserted && cumSecs > 0) {
    // Show where news break would go if not enough items yet
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
        No items yet — add songs and speaks above
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        {rows.map(row => {
          if (row.type === 'news') return <NewsBreak key={row.key} label={row.label} />;
          return (
            <RundownItem
              key={row.item.id}
              item={row.item}
              index={row.index}
              cumSecs={row.cumSecs}
              isInHour1={row.isInHour1}
              onRemove={onRemove}
              onUpdate={onUpdate}
            />
          );
        })}
      </SortableContext>
    </DndContext>
  );
}
