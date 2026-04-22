import React, { useState, useEffect, useCallback } from 'react';
import AddItemForm from './components/AddItemForm';
import Rundown from './components/Rundown';
import QuotaBar from './components/QuotaBar';
import ExportPanel from './components/ExportPanel';
import { calcQuotas, calcTotalTime, HOUR1_END, HOUR2_END, ITEM_TYPES } from './utils';

const STORAGE_KEY = 'brimheim_episodes';

const defaultEpisode = () => ({
  id: Date.now().toString(),
  title: '',
  guestName: '',
  items: [],
  createdAt: new Date().toISOString(),
});

// Calculate time per block
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

export default function App() {
  const [episodes, setEpisodes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeId, setActiveId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY + '_active');
      return saved || null;
    } catch { return null; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeEpisode = episodes.find(e => e.id === activeId) || null;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(episodes));
  }, [episodes]);

  useEffect(() => {
    if (activeId) localStorage.setItem(STORAGE_KEY + '_active', activeId);
  }, [activeId]);

  const updateEpisode = useCallback((id, updater) => {
    setEpisodes(prev => prev.map(e => e.id === id ? { ...e, ...updater(e) } : e));
  }, []);

  const createEpisode = () => {
    const ep = defaultEpisode();
    setEpisodes(prev => [ep, ...prev]);
    setActiveId(ep.id);
  };

  const deleteEpisode = (id) => {
    if (!window.confirm('Delete this episode?')) return;
    setEpisodes(prev => prev.filter(e => e.id !== id));
    if (activeId === id) setActiveId(episodes.find(e => e.id !== id)?.id || null);
  };

  const addItem = (item) => {
    if (!activeId) return;
    updateEpisode(activeId, e => ({ items: [...e.items, item] }));
  };

  const removeItem = (itemId) => {
    updateEpisode(activeId, e => ({ items: e.items.filter(i => i.id !== itemId) }));
  };

  const updateItem = (itemId, updated) => {
    updateEpisode(activeId, e => ({ items: e.items.map(i => i.id === itemId ? { ...i, ...updated } : i) }));
  };

  const reorderItems = (newItems) => {
    updateEpisode(activeId, () => ({ items: newItems }));
  };

  const items = activeEpisode?.items || [];
  const quotas = calcQuotas(items);
  const totalSecs = calcTotalTime(items);
  const blockSecs = calcBlockSecs(items);

  // Warnings
  const warnings = [];
  if (quotas.danishPct < 30 && items.filter(i => i.type === ITEM_TYPES.SONG).length > 0) warnings.push('Danish quota not met (30%)');
  if (quotas.p6Pct < 30 && items.filter(i => i.type === ITEM_TYPES.SONG).length > 0) warnings.push('P6 Beat quota not met (30%)');
  const uncleared = items.filter(i => i.type === ITEM_TYPES.SONG && !i.diskoteketCleared);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 240 : 0,
        minWidth: sidebarOpen ? 240 : 0,
        overflow: 'hidden',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s, min-width 0.2s',
        flexShrink: 0,
      }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.15rem', fontWeight: 300, color: 'var(--accent)', marginBottom: 2 }}>
            Radio Planner
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Brimheim / P6 Beat</div>
        </div>

        <div style={{ padding: '12px 12px 0' }}>
          <button onClick={createEpisode} style={{
            width: '100%', padding: '8px', background: 'var(--accent2)', color: '#0e0e0e',
            borderRadius: 5, fontSize: '0.82rem', fontWeight: 500,
          }}>
            + New Episode
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px' }}>
          {episodes.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', padding: '20px 8px', textAlign: 'center', fontStyle: 'italic' }}>
              No episodes yet
            </div>
          )}
          {episodes.map(ep => (
            <div key={ep.id} onClick={() => setActiveId(ep.id)} style={{
              padding: '9px 10px',
              borderRadius: 5,
              marginBottom: 3,
              cursor: 'pointer',
              background: activeId === ep.id ? 'var(--surface3)' : 'transparent',
              border: `1px solid ${activeId === ep.id ? 'var(--border)' : 'transparent'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.83rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ep.title || 'Untitled episode'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {ep.items.length} items · {ep.guestName || 'No guest set'}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); deleteEpisode(ep.id); }} style={{
                background: 'transparent', color: 'var(--text-muted)', padding: '2px 5px', borderRadius: 3, fontSize: '0.75rem',
                border: '1px solid transparent', flexShrink: 0,
              }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'transparent', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 4, fontSize: '1rem', border: '1px solid var(--border)' }}>☰</button>
          {activeEpisode ? (
            <>
              <input
                value={activeEpisode.title}
                onChange={e => updateEpisode(activeId, () => ({ title: e.target.value }))}
                placeholder="Episode title"
                style={{ fontSize: '1rem', fontFamily: 'Fraunces, serif', fontWeight: 300, background: 'transparent', border: 'none', color: 'var(--text)', flex: 1, padding: 0 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Guest:</span>
                <input
                  value={activeEpisode.guestName}
                  onChange={e => updateEpisode(activeId, () => ({ guestName: e.target.value }))}
                  placeholder="Guest artist"
                  style={{ width: 150, fontSize: '0.82rem' }}
                />
              </div>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Select or create an episode</span>
          )}
        </div>

        {!activeEpisode ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.8rem', fontWeight: 300, color: 'var(--text-dim)' }}>
              No episode open
            </div>
            <button onClick={createEpisode} style={{ padding: '10px 22px', background: 'var(--accent2)', color: '#0e0e0e', borderRadius: 6, fontSize: '0.9rem', fontWeight: 500 }}>
              + Create first episode
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 0, flex: 1, alignItems: 'start' }}>

            {/* Left: rundown */}
            <div style={{ padding: 24, borderRight: '1px solid var(--border)' }}>
              {/* Warnings */}
              {(warnings.length > 0 || uncleared.length > 0) && (
                <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {warnings.map(w => (
                    <div key={w} style={{ background: 'rgba(201,110,110,0.1)', border: '1px solid var(--red)', borderRadius: 5, padding: '7px 12px', fontSize: '0.8rem', color: 'var(--red)' }}>
                      ⚠ {w}
                    </div>
                  ))}
                  {uncleared.length > 0 && (
                    <div style={{ background: 'rgba(212,185,106,0.1)', border: '1px solid var(--yellow)', borderRadius: 5, padding: '7px 12px', fontSize: '0.8rem', color: 'var(--yellow)' }}>
                      ⚠ {uncleared.length} song{uncleared.length > 1 ? 's' : ''} not cleared in Diskoteket: {uncleared.map(s => s.title).join(', ')}
                    </div>
                  )}
                </div>
              )}

              <AddItemForm onAdd={addItem} />
              <div style={{ marginTop: 16 }}>
                <Rundown items={items} onReorder={reorderItems} onRemove={removeItem} onUpdate={updateItem} />
              </div>
            </div>

            {/* Right: stats + export */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 65 }}>
              <QuotaBar quotas={quotas} totalSecs={totalSecs} blockSecs={blockSecs} />
              <ExportPanel items={items} quotas={quotas} episodeTitle={activeEpisode.title} guestName={activeEpisode.guestName} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
