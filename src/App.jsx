import React, { useState, useEffect, useCallback } from 'react';
import Rundown from './components/Rundown';
import ExportPanel from './components/ExportPanel';
import { calcQuotas, calcTotalTime, HOUR1_END, ITEM_TYPES, generateId, formatDuration } from './utils';

const STORAGE_KEY = 'brimheim_episodes';

const defaultEpisode = () => ({
  id: Date.now().toString(),
  title: '',
  guestName: '',
  items: [],
  createdAt: new Date().toISOString(),
});

const calcBlockSecs = (items) => {
  let cumSecs = 0;
  let b1 = 0, b2 = 0;
  items.forEach(item => {
    const dur = item.duration || 0;
    if (cumSecs < HOUR1_END) {
      const inB1 = Math.min(dur, HOUR1_END - cumSecs);
      b1 += inB1;
      b2 += dur - inB1;
    } else {
      b2 += dur;
    }
    cumSecs += dur;
  });
  return [b1, b2];
};

const StatCard = ({ label, value, sub, warn }) => (
  <div style={{
    background: 'var(--surface)',
    border: `1px solid ${warn ? 'var(--red)' : 'var(--border)'}`,
    borderRadius: 8,
    padding: '14px 18px',
    flex: 1,
    minWidth: 0,
  }}>
    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: '1.7rem', fontFamily: 'Fraunces, serif', fontWeight: 300, color: warn ? 'var(--red)' : 'var(--green)', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 5 }}>{sub}</div>
  </div>
);

export default function App() {
  const [episodes, setEpisodes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed && parsed.length > 0 ? parsed : [defaultEpisode()];
    } catch { return [defaultEpisode()]; }
  });

  const [activeId, setActiveId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY + '_active') || null;
    } catch { return null; }
  });

  const activeEpisode = episodes.find(e => e.id === activeId) || episodes[0] || null;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(episodes));
  }, [episodes]);

  useEffect(() => {
    if (activeId) localStorage.setItem(STORAGE_KEY + '_active', activeId);
  }, [activeId]);

  const updateEpisode = useCallback((id, updater) => {
    setEpisodes(prev => prev.map(e => e.id === id ? { ...e, ...updater(e) } : e));
  }, []);

  const addItem = (item, insertAt = null) => {
    if (!activeEpisode) return;
    updateEpisode(activeEpisode.id, e => {
      const next = [...e.items];
      if (insertAt !== null && insertAt <= next.length) {
        next.splice(insertAt, 0, item);
      } else {
        next.push(item);
      }
      return { items: next };
    });
  };

  const removeItem = (itemId) => {
    updateEpisode(activeEpisode.id, e => ({ items: e.items.filter(i => i.id !== itemId) }));
  };

  const updateItem = (itemId, updated) => {
    updateEpisode(activeEpisode.id, e => ({ items: e.items.map(i => i.id === itemId ? { ...i, ...updated } : i) }));
  };

  const reorderItems = (newItems) => {
    updateEpisode(activeEpisode.id, () => ({ items: newItems }));
  };

  const createEpisode = () => {
    const ep = defaultEpisode();
    setEpisodes(prev => [ep, ...prev]);
    setActiveId(ep.id);
  };

  if (!activeEpisode) return null;

  const items = activeEpisode.items;
  const quotas = calcQuotas(items);
  const songCount = items.filter(i => i.type === ITEM_TYPES.SONG).length;
  const [b1, b2] = calcBlockSecs(items);
  const b1Over = b1 > HOUR1_END;
  const b2Over = b2 > HOUR1_END;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: '1.4rem', color: 'var(--text)', marginBottom: 10 }}>
            Brimheim Radio Planner
          </h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              value={activeEpisode.title}
              onChange={e => updateEpisode(activeEpisode.id, () => ({ title: e.target.value }))}
              placeholder="Episode title"
              style={{ width: 200 }}
            />
            <input
              value={activeEpisode.guestName}
              onChange={e => updateEpisode(activeEpisode.id, () => ({ guestName: e.target.value }))}
              placeholder="Guest artist"
              style={{ width: 160 }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={activeEpisode.id}
            onChange={e => setActiveId(e.target.value)}
            style={{ fontSize: '0.8rem' }}
          >
            {episodes.map(ep => (
              <option key={ep.id} value={ep.id}>{ep.title || 'Untitled episode'}</option>
            ))}
          </select>
          <button
            onClick={createEpisode}
            style={{ padding: '6px 12px', background: 'var(--surface2)', color: 'var(--text-dim)', borderRadius: 5, fontSize: '0.8rem', border: '1px solid var(--border)' }}
          >
            + New
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <StatCard
          label="Hour 1 used"
          value={formatDuration(b1)}
          sub={`of 55:00`}
          warn={b1Over}
        />
        <StatCard
          label="Hour 2 used"
          value={formatDuration(b2)}
          sub={`of 55:00`}
          warn={b2Over}
        />
        <StatCard
          label="Danish music"
          value={`${Math.round(quotas.danishPct)}%`}
          sub={`${songCount > 0 ? Math.round(quotas.danishSecs / 60) : 0} min of ${songCount} songs`}
          warn={quotas.danishPct < 30 && songCount > 0}
        />
        <StatCard
          label="P6 playlist"
          value={`${Math.round(quotas.p6Pct)}%`}
          sub={`${songCount > 0 ? Math.round(quotas.p6Secs / 60) : 0} min of ${songCount} songs`}
          warn={quotas.p6Pct < 30 && songCount > 0}
        />
      </div>

      {/* Rundown */}
      <Rundown
        items={items}
        onReorder={reorderItems}
        onRemove={removeItem}
        onUpdate={updateItem}
        onAdd={addItem}
      />

      {/* Export */}
      <div style={{ marginTop: 28 }}>
        <ExportPanel
          items={items}
          quotas={quotas}
          episodeTitle={activeEpisode.title}
          guestName={activeEpisode.guestName}
        />
      </div>
    </div>
  );
}
