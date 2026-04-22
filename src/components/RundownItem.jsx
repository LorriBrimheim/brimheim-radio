import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDuration, formatTimestamp, ITEM_TYPES, MAX_SPEAK, MAX_SPEAK_SOLO, parseDuration } from '../utils';

const SPEAK_WARN_COLOR = 'var(--yellow)';
const SPEAK_OK_COLOR = 'var(--text-dim)';

export default function RundownItem({ item, index, onRemove, onUpdate, cumSecs, isInHour1 }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isSong = item.type === ITEM_TYPES.SONG;
  const isSpeak = item.type === ITEM_TYPES.SPEAK;

  const speakOverMax = isSpeak && item.duration > MAX_SPEAK;
  const speakOverSolo = isSpeak && isInHour1 && item.duration > MAX_SPEAK_SOLO; // rough solo check

  const startEdit = () => {
    setDraft({ ...item, durationStr: formatDuration(item.duration) });
    setEditing(true);
  };

  const saveEdit = () => {
    const updated = { ...draft, duration: parseDuration(draft.durationStr) };
    delete updated.durationStr;
    onUpdate(item.id, updated);
    setEditing(false);
  };

  const tagStyle = (color, bg) => ({
    fontSize: '0.65rem',
    padding: '2px 6px',
    borderRadius: 3,
    background: bg || 'transparent',
    color,
    border: `1px solid ${color}`,
    lineHeight: 1.4,
  });

  if (editing) {
    return (
      <div ref={setNodeRef} style={{ ...style, background: 'var(--surface2)', border: '1px solid var(--accent2)', borderRadius: 6, padding: 14, marginBottom: 6 }}>
        {isSong && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={draft.title || ''} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Title" />
              <input value={draft.artist || ''} onChange={e => setDraft(d => ({ ...d, artist: e.target.value }))} placeholder="Artist" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
              <input value={draft.durationStr || ''} onChange={e => setDraft(d => ({ ...d, durationStr: e.target.value }))} placeholder="Duration" />
              <input value={draft.notes || ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Notes" />
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.8rem' }}>
              {[['isDanish','🇩🇰 Danish'],['isP6Beat','📻 P6 Beat'],['isGuest','🎤 Guest'],['diskoteketCleared','✅ Diskoteket']].map(([k,l]) => (
                <label key={k} style={{ display: 'flex', gap: 5, alignItems: 'center', cursor: 'pointer', color: 'var(--text-dim)' }}>
                  <input type="checkbox" checked={!!draft[k]} onChange={e => setDraft(d => ({ ...d, [k]: e.target.checked }))}
                    style={{ accentColor: 'var(--accent2)' }} />
                  {l}
                </label>
              ))}
            </div>
          </div>
        )}
        {isSpeak && (
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
            <input value={draft.durationStr || ''} onChange={e => setDraft(d => ({ ...d, durationStr: e.target.value }))} placeholder="Duration" />
            <input value={draft.notes || ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Topic / notes" />
          </div>
        )}
        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
          <button onClick={saveEdit} style={{ padding: '5px 12px', background: 'var(--accent2)', color: '#0e0e0e', borderRadius: 4, fontSize: '0.8rem' }}>Save</button>
          <button onClick={() => setEditing(false)} style={{ padding: '5px 12px', background: 'var(--surface3)', color: 'var(--text-dim)', borderRadius: 4, fontSize: '0.8rem' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={{
      ...style,
      background: 'var(--surface)',
      border: `1px solid ${speakOverMax ? 'var(--red)' : 'var(--border)'}`,
      borderLeft: `3px solid ${isSong ? (item.isGuest ? 'var(--guest)' : 'var(--solo)') : 'var(--accent2)'}`,
      borderRadius: 6,
      padding: '10px 14px',
      marginBottom: 5,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      {/* Drag handle */}
      <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--text-muted)', fontSize: '1rem', flexShrink: 0, touchAction: 'none' }}>⠿</div>

      {/* Index + timestamp */}
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 52 }}>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>#{index + 1}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--accent2)', fontVariantNumeric: 'tabular-nums' }}>{formatTimestamp(cumSecs)}</div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isSong && (
          <>
            <div style={{ fontWeight: 500, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.title}
              {item.artist && <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: 6 }}>— {item.artist}</span>}
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
              {item.isDanish && <span style={tagStyle('var(--green)')}>🇩🇰 DK</span>}
              {item.isP6Beat && <span style={tagStyle('var(--blue)')}>P6</span>}
              {item.isGuest && <span style={tagStyle('var(--guest)')}>Guest</span>}
              {item.diskoteketCleared
                ? <span style={tagStyle('var(--green)')}>✓ cleared</span>
                : <span style={tagStyle('var(--red)')}>⚠ check diskoteket</span>}
              {item.notes && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{item.notes}</span>}
            </div>
          </>
        )}
        {isSpeak && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: speakOverMax ? 'var(--red)' : 'var(--accent)', fontSize: '0.85rem' }}>
              🎙 Speak
            </span>
            {speakOverMax && <span style={{ fontSize: '0.72rem', color: 'var(--red)' }}>over 3:30 limit</span>}
            {!speakOverMax && speakOverSolo && <span style={{ fontSize: '0.72rem', color: 'var(--yellow)' }}>over 2:00 solo limit</span>}
            {item.notes && <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>{item.notes}</span>}
          </div>
        )}
      </div>

      {/* Duration */}
      <div style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
        {formatDuration(item.duration)}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button onClick={startEdit} style={{ padding: '3px 8px', background: 'var(--surface3)', color: 'var(--text-dim)', borderRadius: 4, fontSize: '0.75rem' }}>Edit</button>
        <button onClick={() => onRemove(item.id)} style={{ padding: '3px 8px', background: 'transparent', color: 'var(--text-muted)', borderRadius: 4, fontSize: '0.75rem', border: '1px solid var(--border)' }}>✕</button>
      </div>
    </div>
  );
}
