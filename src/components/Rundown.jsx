import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import RundownItem from './RundownItem';
import { ITEM_TYPES, HOUR1_END, HOUR2_END, NEWS_DURATION, formatDuration } from '../utils';

const HourHeader = ({ label, usedSecs }) => {
  const max = 55 * 60;
  const over = usedSecs > max;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 14px', marginBottom: 8, marginTop: 4,
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 5,
    }}>
      <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {usedSecs > 0 && (
        <span style={{ fontSize: '0.7rem', color: over ? 'var(--red)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {formatDuration(usedSecs)} / 55:00{over ? ' — OVER' : ''}
        </span>
      )}
    </div>
  );
};

const NewsBreakRow = ({ label, clockTime }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    margin: '8px 0', padding: '10px 14px',
    background: 'repeating-linear-gradient(45deg, var(--surface2), var(--surface2) 4px, var(--bg) 4px, var(--bg) 12px)',
    borderRadius: 5, border: '1px dashed var(--border)',
  }}>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>📰 {label}</span>
    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
      {formatDuration(clockTime)} — 5:00 fixed
    </span>
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

  let progSecs = 0;
  let clockSecs = 0;
  let news1Inserted = false;
  let news2Inserted = false;

  let h1Total = 0, h2Total = 0;
  let tempProg = 0;
  items.forEach(item => {
    const dur = item.duration || 0;
    if (tempProg < HOUR1_END) {
      const inH1 = Math.min(dur, HOUR1_END - tempProg);
      h1Total += inH1;
      h2Total += dur - inH1;
    } else {
      h2Total += Math.min(dur, HOUR2_END - tempProg);
    }
    tempProg += dur;
  });

  const rows = [];
  rows.push({ type: 'hour-header', key: 'hour1-header', label: 'Hour 1', usedSecs: h1Total });

  items.forEach((item, index) => {
    if (!news1Inserted && progSecs >= HOUR1_END) {
      rows.push({ type: 'news', key: 'news-break-1', label: 'News Break — End of Hour 1', clockTime: clockSecs });
      clockSecs += NEWS_DURATION;
      news1Inserted = true;
      rows.push({ type: 'hour-header', key: 'hour2-header', label: 'Hour 2', usedSecs: h2Total });
    }

    if (!news2Inserted && news1Inserted && progSecs >= HOUR2_END) {
      rows.push({ type: 'news', key: 'news-break-2', label: 'News Break — End of Hour 2', clockTime: clockSecs });
      clockSecs += NEWS_DURATION;
      news2Inserted = true;
    }

    rows.push({
      type: 'item',
      item,
      index,
      cumSecs: clockSecs,
      isInHour1: progSecs < HOUR1_END,
    });

    const dur = item.duration || 0;
    progSecs += dur;
    clockSecs += dur;
  });

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
          if (row.type === 'hour-header') return <HourHeader key={row.key} label={row.label} usedSecs={row.usedSecs} />;
          if (row.type === 'news') return <NewsBreakRow key={row.key} label={row.label} clockTime={row.clockTime} />;
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
