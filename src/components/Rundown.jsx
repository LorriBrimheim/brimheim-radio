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
import { NEWS_DURATION, HOUR1_END, ITEM_TYPES, formatDuration, generateId } from '../utils';

const HourHeader = ({ num, usedSecs, itemCount, bgColor }) => {
  const remaining = 55 * 60 - usedSecs;
  const over = remaining < 0;
  const tight = !over && remaining < 5 * 60;
  const remColor = over ? '#ff8080' : tight ? '#ffd080' : '#e0ffec';
  return (
    <div style={{
      background: bgColor,
      borderRadius: '6px 6px 0 0',
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: '1.6rem', fontWeight: 400, color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>
          {String(num).padStart(2, '0')}
        </span>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: '0.08em' }}>
            HOUR {num} OF 2
          </div>
          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
            {itemCount} items · {formatDuration(usedSecs)}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '1.3rem', fontFamily: 'Fraunces, serif', color: remColor, lineHeight: 1 }}>
          {over ? `+${formatDuration(Math.abs(remaining))}` : formatDuration(remaining)}
        </div>
        <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', marginTop: 1 }}>REMAINING</div>
      </div>
    </div>
  );
};

const ColHeader = () => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '18px 48px 1fr 46px 28px 28px 26px 20px',
    gap: 4, padding: '5px 10px 4px', background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
  }}>
    {['', '', 'Title / Artist', 'Dur', 'DK', 'P6', 'Disk', ''].map((c, i) => (
      <div key={i} style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{c}</div>
    ))}
  </div>
);

const NewsRow = ({ clockTime }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 14px', marginTop: 10,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ background: 'var(--text-dim)', color: 'var(--surface3)', fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 12, letterSpacing: '0.05em' }}>NEWS</span>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Fixed break · 5:00</span>
    </div>
    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
      {formatDuration(clockTime)} → {formatDuration(clockTime + NEWS_DURATION)}
    </span>
  </div>
);

const AddButtons = ({ onAddSong, onAddSpeak }) => (
  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
    {[['+ ADD SONG', onAddSong], ['+ ADD SPEAK', onAddSpeak]].map(([label, fn]) => (
      <button key={label} onClick={fn} style={{
        flex: 1, padding: '7px', background: 'transparent',
        border: '1px dashed var(--border)', borderRadius: 5,
        color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >{label}</button>
    ))}
  </div>
);

function DroppableZone({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={{ minHeight: 48, transition: 'background 0.1s', background: isOver ? 'rgba(209,76,26,0.05)' : 'transparent', borderRadius: 4 }}>
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

  // Hour 1 timestamps from 0; Hour 2 timestamps from HOUR1_END + NEWS (= 60:00)
  const h1CumSecs = h1Items.map((_, idx) => h1Items.slice(0, idx).reduce((s, i) => s + (i.duration || 0), 0));
  const h2CumSecs = h2Items.map((_, idx) => HOUR1_END + NEWS_DURATION + h2Items.slice(0, idx).reduce((s, i) => s + (i.duration || 0), 0));

  const handleDragStart = ({ active }) => setActiveItem(items.find(i => i.id === active.id) || null);

  const handleDragEnd = ({ active, over }) => {
    setActiveItem(null);
    if (!over || active.id === over.id) return;
    const draggedItem = items.find(i => i.id === active.id);
    if (!draggedItem) return;
    const srcHour = draggedItem.hour || 1;
    let tgtHour = srcHour;
    if (over.id === 'zone-hour1') tgtHour = 1;
    else if (over.id === 'zone-hour2') tgtHour = 2;
    else { const oi = items.find(i => i.id === over.id); if (oi) tgtHour = oi.hour || 1; }

    if (srcHour === tgtHour) {
      const hourItems = srcHour === 1 ? [...h1Items] : [...h2Items];
      const other = srcHour === 1 ? h2Items : h1Items;
      const oi = hourItems.findIndex(i => i.id === active.id);
      const ni = hourItems.findIndex(i => i.id === over.id);
      if (oi === -1 || ni === -1 || oi === ni) return;
      const reordered = arrayMove(hourItems, oi, ni);
      onReorder(srcHour === 1 ? [...reordered, ...other] : [...other, ...reordered]);
    } else {
      const upd = { ...draggedItem, hour: tgtHour };
      const newH1 = h1Items.filter(i => i.id !== active.id);
      const newH2 = h2Items.filter(i => i.id !== active.id);
      if (tgtHour === 1) {
        const idx = newH1.findIndex(i => i.id === over.id);
        const finalH1 = idx === -1 ? [...newH1, upd] : [...newH1.slice(0, idx), upd, ...newH1.slice(idx)];
        onReorder([...finalH1, ...newH2]);
      } else {
        const idx = newH2.findIndex(i => i.id === over.id);
        const finalH2 = idx === -1 ? [...newH2, upd] : [...newH2.slice(0, idx), upd, ...newH2.slice(idx)];
        onReorder([...newH1, ...finalH2]);
      }
    }
  };

  const blankItem = (hour, type = ITEM_TYPES.SONG) => ({
    id: generateId(), type, segment: 'solo', hour,
    title: '', artist: '', duration: 0,
    isDanish: false, isP6Beat: false, isGuest: false,
    diskoteketCleared: false, notes: '',
  });

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Hour 1 */}
        <div>
          <HourHeader num={1} usedSecs={h1Duration} itemCount={h1Items.length} bgColor="var(--olive)" />
          <ColHeader />
          <div style={{ background: 'var(--surface)', borderRadius: '0 0 6px 6px', paddingBottom: 4 }}>
            <SortableContext items={h1Items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <DroppableZone id="zone-hour1">
                {h1Items.length === 0 && (
                  <div style={{ padding: '16px 10px', color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                    No items — add below or drag from Hour 2
                  </div>
                )}
                {h1Items.map((item, idx) => (
                  <RundownItem key={item.id} item={item} rowNum={idx + 1} cumSecs={h1CumSecs[idx]} onRemove={onRemove} onUpdate={onUpdate} />
                ))}
              </DroppableZone>
            </SortableContext>
          </div>
          <AddButtons onAddSong={() => onAdd(blankItem(1, ITEM_TYPES.SONG))} onAddSpeak={() => onAdd(blankItem(1, ITEM_TYPES.SPEAK))} />
        </div>

        {/* Hour 2 */}
        <div>
          <HourHeader num={2} usedSecs={h2Duration} itemCount={h2Items.length} bgColor="#3d5220" />
          <ColHeader />
          <div style={{ background: 'var(--surface)', borderRadius: '0 0 6px 6px', paddingBottom: 4 }}>
            <SortableContext items={h2Items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <DroppableZone id="zone-hour2">
                {h2Items.length === 0 && (
                  <div style={{ padding: '16px 10px', color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                    No items — drag from Hour 1 or add below
                  </div>
                )}
                {h2Items.map((item, idx) => (
                  <RundownItem key={item.id} item={item} rowNum={idx + 1} cumSecs={h2CumSecs[idx]} onRemove={onRemove} onUpdate={onUpdate} />
                ))}
              </DroppableZone>
            </SortableContext>
          </div>
          <AddButtons onAddSong={() => onAdd(blankItem(2, ITEM_TYPES.SONG))} onAddSpeak={() => onAdd(blankItem(2, ITEM_TYPES.SPEAK))} />
        </div>
      </div>

      {/* News break */}
      <NewsRow clockTime={h1Duration} />

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div style={{ padding: '6px 12px', background: 'var(--surface3)', border: '1px solid var(--orange)', borderRadius: 5, fontSize: '0.8rem', color: 'var(--text)', boxShadow: '0 6px 20px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'grabbing' }}>
            <span style={{ color: 'var(--orange)' }}>⠿</span>
            <span>{activeItem.type === ITEM_TYPES.SONG ? `${activeItem.title || 'Untitled'}${activeItem.artist ? ' — ' + activeItem.artist : ''}` : `Speak${activeItem.notes ? ': ' + activeItem.notes : ''}`}</span>
            {activeItem.duration > 0 && <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(activeItem.duration)}</span>}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
