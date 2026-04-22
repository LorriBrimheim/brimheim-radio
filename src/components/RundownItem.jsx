import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDuration, ITEM_TYPES, MAX_SPEAK, parseDuration } from '../utils';

const SEGMENT_OPTIONS = [
  { value: 'solo', label: 'Solo DJ' },
  { value: 'guest', label: 'Gæst' },
];

const TYPE_OPTIONS = [
  { value: ITEM_TYPES.SONG, label: 'Sang' },
  { value: ITEM_TYPES.SPEAK, label: 'Speak' },
];

const inputStyle = {
  fontSize: '0.8rem',
  padding: '4px 7px',
  width: '100%',
  boxSizing: 'border-box',
};

export default function RundownItem({ item, index, onRemove, onUpdate, cumSecs }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const segment = item.segment || (item.isGuest ? 'guest' : 'solo');
  const isSong = item.type === ITEM_TYPES.SONG;
  const isSpeakOver = item.type === ITEM_TYPES.SPEAK && item.duration > MAX_SPEAK;

  const [durStr, setDurStr] = useState(item.duration > 0 ? formatDuration(item.duration) : '');
  const [titleArtist, setTitleArtist] = useState(
    isSong
      ? `${item.title || ''}${item.artist ? ' — ' + item.artist : ''}`
      : (item.notes || '')
  );

  useEffect(() => {
    setTitleArtist(
      item.type === ITEM_TYPES.SONG
        ? `${item.title || ''}${item.artist ? ' — ' + item.artist : ''}`
        : (item.notes || '')
    );
  }, [item.type]);

  useEffect(() => {
    setDurStr(item.duration > 0 ? formatDuration(item.duration) : '');
  }, [item.id]);

  const update = (field, value) => onUpdate(item.id, { [field]: value });

  const handleTitleBlur = () => {
    if (item.type === ITEM_TYPES.SONG) {
      const parts = titleArtist.split(' — ');
      onUpdate(item.id, { title: parts[0].trim(), artist: parts.slice(1).join(' — ').trim() });
    } else {
      update('notes', titleArtist);
    }
  };

  const handleDurBlur = () => {
    const secs = parseDuration(durStr);
    update('duration', secs);
    setDurStr(secs > 0 ? formatDuration(secs) : '');
  };

  // Diskoteket indicator — only relevant for songs
  const diskColor = item.diskoteketCleared ? 'var(--green)' : 'var(--red)';
  const diskLabel = item.diskoteketCleared ? '✓' : '⚠';

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        display: 'grid',
        gridTemplateColumns: '20px 100px 1fr 72px 72px 46px 34px 38px 32px',
        gap: 5,
        alignItems: 'center',
        padding: '5px 8px',
        marginBottom: 4,
        background: 'var(--surface)',
        border: `1px solid ${isSpeakOver ? 'var(--red)' : 'var(--border)'}`,
        borderLeft: `3px solid ${segment === 'guest' ? 'var(--guest)' : 'var(--solo)'}`,
        borderRadius: 6,
      }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        title={`${Math.floor(cumSecs / 60)}:${String(cumSecs % 60).padStart(2, '0')}`}
        style={{ cursor: 'grab', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', touchAction: 'none', userSelect: 'none' }}
      >
        ⠿
      </div>

      {/* Segment */}
      <select
        value={segment}
        onChange={e => {
          update('segment', e.target.value);
          update('isGuest', e.target.value === 'guest');
        }}
        style={inputStyle}
      >
        {SEGMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Title / Artist or Notes */}
      <input
        value={titleArtist}
        onChange={e => setTitleArtist(e.target.value)}
        onBlur={handleTitleBlur}
        placeholder={isSong ? 'Titel — Artist' : 'Speak emne...'}
        style={inputStyle}
      />

      {/* Duration */}
      <input
        value={durStr}
        onChange={e => setDurStr(e.target.value)}
        onBlur={handleDurBlur}
        onKeyDown={e => e.key === 'Enter' && e.target.blur()}
        placeholder="3:24"
        style={{ ...inputStyle, textAlign: 'center' }}
      />

      {/* Type */}
      <select
        value={item.type}
        onChange={e => update('type', e.target.value)}
        style={inputStyle}
      >
        {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Danish */}
      <div style={{ textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={!!item.isDanish}
          onChange={e => update('isDanish', e.target.checked)}
          disabled={!isSong}
          style={{ width: 15, height: 15, accentColor: 'var(--accent2)', cursor: isSong ? 'pointer' : 'default' }}
        />
      </div>

      {/* P6 */}
      <div style={{ textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={!!item.isP6Beat}
          onChange={e => update('isP6Beat', e.target.checked)}
          disabled={!isSong}
          style={{ width: 15, height: 15, accentColor: 'var(--accent2)', cursor: isSong ? 'pointer' : 'default' }}
        />
      </div>

      {/* Diskoteket clearance */}
      <div style={{ textAlign: 'center' }}>
        {isSong ? (
          <button
            onClick={() => update('diskoteketCleared', !item.diskoteketCleared)}
            title={item.diskoteketCleared ? 'Cleared in Diskoteket — click to unmark' : 'Not cleared in Diskoteket — click to mark cleared'}
            style={{
              background: 'transparent',
              color: diskColor,
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '2px 4px',
              borderRadius: 3,
              border: `1px solid ${diskColor}`,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            {diskLabel}
          </button>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onRemove(item.id)}
        style={{
          background: 'transparent', color: 'var(--text-muted)',
          padding: '3px 6px', borderRadius: 4, fontSize: '0.8rem',
          border: '1px solid transparent',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--red)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        ×
      </button>
    </div>
  );
}
