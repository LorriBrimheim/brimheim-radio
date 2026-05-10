import React, { useState, useEffect, useRef } from 'react';
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

const DURATION_PRESETS = ['0:30', '1:00', '1:30', '2:00', '3:00', '3:30', '4:00', '4:30', '5:00'];

const inputStyle = {
  fontSize: '0.8rem',
  padding: '4px 7px',
  width: '100%',
  boxSizing: 'border-box',
};

function useDebounce(value, delay) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
}

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

  // Autocomplete state
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const dropdownRef = useRef(null);
  const presetsRef = useRef(null);

  const debouncedQuery = useDebounce(isSong ? titleArtist : '', 420);

  // Sync title/artist when type changes
  useEffect(() => {
    setTitleArtist(
      item.type === ITEM_TYPES.SONG
        ? `${item.title || ''}${item.artist ? ' — ' + item.artist : ''}`
        : (item.notes || '')
    );
  }, [item.type]);

  // Sync duration when item id changes (e.g. after drag reorder)
  useEffect(() => {
    setDurStr(item.duration > 0 ? formatDuration(item.duration) : '');
  }, [item.id]);

  // iTunes autocomplete search
  useEffect(() => {
    if (!isSong || debouncedQuery.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(debouncedQuery)}&entity=song&limit=7&country=dk`
    )
      .then(r => r.json())
      .then(data => {
        const results = (data.results || []).map(r => ({
          title: r.trackName,
          artist: r.artistName,
          duration: Math.round(r.trackTimeMillis / 1000),
        }));
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery, isSong]);

  // Close dropdown/presets on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (presetsRef.current && !presetsRef.current.contains(e.target)) {
        setShowPresets(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const selectResult = (result) => {
    onUpdate(item.id, {
      title: result.title,
      artist: result.artist,
      duration: result.duration,
    });
    setTitleArtist(`${result.title} — ${result.artist}`);
    setDurStr(formatDuration(result.duration));
    setShowDropdown(false);
    setSearchResults([]);
  };

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

  const applyPreset = (preset) => {
    const secs = parseDuration(preset);
    update('duration', secs);
    setDurStr(preset);
    setShowPresets(false);
  };

  const diskColor = item.diskoteketCleared ? 'var(--green)' : 'var(--red)';

  const timestamp = `${Math.floor(cumSecs / 60)}:${String(cumSecs % 60).padStart(2, '0')}`;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        position: 'relative',
      }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: '16px 82px 1fr 78px 70px 44px 32px 36px 28px',
        gap: 5,
        alignItems: 'center',
        padding: '5px 8px',
        marginBottom: 4,
        background: 'var(--surface)',
        border: `1px solid ${isSpeakOver ? 'var(--red)' : 'var(--border)'}`,
        borderLeft: `3px solid ${segment === 'guest' ? 'var(--guest)' : 'var(--solo)'}`,
        borderRadius: 6,
      }}>

        {/* Drag handle — hover shows timestamp, title explains cross-hour dragging */}
        <div
          {...attributes}
          {...listeners}
          title={`${timestamp} — drag to reorder or move between hours`}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            textAlign: 'center',
            touchAction: 'none',
            userSelect: 'none',
          }}
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

        {/* Title / Artist with autocomplete */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <input
            value={titleArtist}
            onChange={e => {
              setTitleArtist(e.target.value);
              if (isSong && e.target.value.length >= 3) setShowDropdown(true);
            }}
            onBlur={handleTitleBlur}
            onKeyDown={e => { if (e.key === 'Escape') setShowDropdown(false); }}
            placeholder={isSong ? 'Titel — Artist' : 'Speak emne...'}
            style={{ ...inputStyle, paddingRight: searching ? 22 : 7 }}
          />

          {/* Searching spinner */}
          {searching && (
            <div style={{
              position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
              fontSize: '0.65rem', color: 'var(--accent2)',
            }}>
              ···
            </div>
          )}

          {/* Autocomplete dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 2px)',
              left: 0,
              right: 0,
              background: 'var(--surface2)',
              border: '1px solid var(--accent2)',
              borderRadius: 6,
              zIndex: 200,
              boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}>
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  onMouseDown={e => { e.preventDefault(); selectResult(r); }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: i < searchResults.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.artist}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent2)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {formatDuration(r.duration)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Duration with preset popup */}
        <div ref={presetsRef} style={{ position: 'relative' }}>
          <input
            value={durStr}
            onChange={e => setDurStr(e.target.value)}
            onFocus={() => setShowPresets(true)}
            onBlur={handleDurBlur}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
            placeholder="3:24"
            style={{ ...inputStyle, textAlign: 'center' }}
          />
          {showPresets && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 2px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '7px',
              zIndex: 200,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              width: 170,
              boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
            }}>
              <div style={{ width: '100%', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Quick fill
              </div>
              {DURATION_PRESETS.map(p => (
                <button
                  key={p}
                  onMouseDown={e => { e.preventDefault(); applyPreset(p); }}
                  style={{
                    padding: '3px 8px',
                    background: 'var(--surface3)',
                    color: 'var(--text-dim)',
                    borderRadius: 3,
                    fontSize: '0.73rem',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent2)'; e.currentTarget.style.color = '#0e0e0e'; e.currentTarget.style.borderColor = 'var(--accent2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

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

        {/* Diskoteket */}
        <div style={{ textAlign: 'center' }}>
          {isSong ? (
            <button
              onClick={() => update('diskoteketCleared', !item.diskoteketCleared)}
              title={item.diskoteketCleared ? 'Cleared in Diskoteket — click to unmark' : 'Not cleared — click to mark'}
              style={{
                background: 'transparent',
                color: diskColor,
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '2px 5px',
                borderRadius: 3,
                border: `1px solid ${diskColor}`,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              {item.diskoteketCleared ? '✓' : '⚠'}
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
    </div>
  );
}
