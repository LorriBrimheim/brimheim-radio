import React, { useState } from 'react';
import { generateId, parseDuration, ITEM_TYPES } from '../utils';

const btnBase = {
  padding: '7px 14px',
  borderRadius: 5,
  fontSize: '0.8rem',
  fontWeight: 500,
  transition: 'background 0.15s, color 0.15s',
};

export default function AddItemForm({ onAdd }) {
  const [tab, setTab] = useState('song');
  const [song, setSong] = useState({ title: '', artist: '', duration: '', isDanish: false, isP6Beat: false, isGuest: false, diskoteketCleared: false, notes: '' });
  const [speak, setSpeak] = useState({ duration: '', notes: '' });

  const addSong = () => {
    const dur = parseDuration(song.duration);
    if (!song.title || !dur) return;
    onAdd({
      id: generateId(), type: ITEM_TYPES.SONG,
      title: song.title, artist: song.artist,
      duration: dur,
      isDanish: song.isDanish, isP6Beat: song.isP6Beat,
      isGuest: song.isGuest,
      diskoteketCleared: song.diskoteketCleared,
      notes: song.notes,
    });
    setSong({ title: '', artist: '', duration: '', isDanish: false, isP6Beat: false, isGuest: false, diskoteketCleared: false, notes: '' });
  };

  const addSpeak = () => {
    const dur = parseDuration(speak.duration);
    if (!dur) return;
    onAdd({ id: generateId(), type: ITEM_TYPES.SPEAK, duration: dur, notes: speak.notes });
    setSpeak({ duration: '', notes: '' });
  };

  const tabStyle = (t) => ({
    ...btnBase,
    background: tab === t ? 'var(--accent2)' : 'var(--surface3)',
    color: tab === t ? '#0e0e0e' : 'var(--text-dim)',
    marginRight: 6,
  });

  const checkStyle = { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-dim)', cursor: 'pointer', userSelect: 'none' };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
      <div style={{ marginBottom: 16, fontFamily: 'Fraunces, serif', fontSize: '1.05rem', fontWeight: 300, color: 'var(--accent)' }}>
        Add to Rundown
      </div>

      <div style={{ marginBottom: 16 }}>
        <button style={tabStyle('song')} onClick={() => setTab('song')}>Song</button>
        <button style={tabStyle('speak')} onClick={() => setTab('speak')}>Speak</button>
      </div>

      {tab === 'song' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input placeholder="Title *" value={song.title} onChange={e => setSong(s => ({ ...s, title: e.target.value }))} />
            <input placeholder="Artist" value={song.artist} onChange={e => setSong(s => ({ ...s, artist: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
            <input placeholder="Duration (3:24) *" value={song.duration} onChange={e => setSong(s => ({ ...s, duration: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addSong()} />
            <input placeholder="Notes (optional)" value={song.notes} onChange={e => setSong(s => ({ ...s, notes: e.target.value }))} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 2 }}>
            {[
              { key: 'isDanish', label: '🇩🇰 Danish' },
              { key: 'isP6Beat', label: '📻 P6 Beat' },
              { key: 'isGuest', label: '🎤 Guest pick' },
              { key: 'diskoteketCleared', label: '✅ Diskoteket cleared' },
            ].map(({ key, label }) => (
              <label key={key} style={checkStyle}>
                <input type="checkbox" checked={song[key]} onChange={e => setSong(s => ({ ...s, [key]: e.target.checked }))}
                  style={{ width: 14, height: 14, accentColor: 'var(--accent2)', background: 'var(--surface2)', border: '1px solid var(--border)' }} />
                {label}
              </label>
            ))}
          </div>

          <button onClick={addSong} style={{ ...btnBase, background: 'var(--accent2)', color: '#0e0e0e', alignSelf: 'flex-start', marginTop: 4 }}>
            + Add Song
          </button>
        </div>
      )}

      {tab === 'speak' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
            <input placeholder="Duration (1:30) *" value={speak.duration} onChange={e => setSpeak(s => ({ ...s, duration: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addSpeak()} />
            <input placeholder="Topic / notes (optional)" value={speak.notes} onChange={e => setSpeak(s => ({ ...s, notes: e.target.value }))} />
          </div>
          <button onClick={addSpeak} style={{ ...btnBase, background: 'var(--surface3)', color: 'var(--text)', alignSelf: 'flex-start', border: '1px solid var(--border)' }}>
            + Add Speak
          </button>
        </div>
      )}
    </div>
  );
}
