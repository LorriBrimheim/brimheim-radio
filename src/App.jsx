import React, { useState, useEffect, useCallback } from 'react';
import Rundown from './components/Rundown';
import { calcQuotas, calcTotalTime, HOUR1_END, ITEM_TYPES, formatDuration, formatTimestamp } from './utils';

const STORAGE_KEY = 'brimheim_episodes';
const DK_MONTHS = ['JAN','FEB','MAR','APR','MAJ','JUN','JUL','AUG','SEP','OKT','NOV','DEC'];
const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

const fmtEpDate = (iso) => {
  try { const d = new Date(iso); return `${d.getDate()} ${DK_MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
  catch { return ''; }
};

const defaultEpisode = () => ({
  id: Date.now().toString(), title: '', guestName: '', items: [],
  createdAt: new Date().toISOString(),
});

const migrateEpisode = (ep) => {
  let cumSecs = 0;
  const items = ep.items.map(item => {
    if (item.hour !== undefined) return item;
    const hour = cumSecs >= HOUR1_END ? 2 : 1;
    cumSecs += item.duration || 0;
    return { ...item, hour };
  });
  return { ...ep, items };
};

const calcBlockSecs = (items) => [
  items.filter(i => (i.hour || 1) === 1).reduce((s, i) => s + (i.duration || 0), 0),
  items.filter(i => (i.hour || 1) === 2).reduce((s, i) => s + (i.duration || 0), 0),
];

export default function App() {
  const [episodes, setEpisodes] = useState(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return (s ? JSON.parse(s) : []).map(migrateEpisode); }
    catch { return []; }
  });
  const [activeId, setActiveId] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY + '_active') || null; } catch { return null; }
  });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  const activeEpisode = episodes.find(e => e.id === activeId) || null;

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(episodes)); }, [episodes]);
  useEffect(() => { if (activeId) localStorage.setItem(STORAGE_KEY + '_active', activeId); }, [activeId]);

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
    updateEpisode(activeId, e => {
      const next = [...e.items];
      const hour = item.hour || 1;
      if (hour === 1) {
        let last = -1;
        next.forEach((it, idx) => { if ((it.hour || 1) === 1) last = idx; });
        next.splice(last + 1, 0, item);
      } else { next.push(item); }
      return { items: next };
    });
  };

  const removeItem = (id) => updateEpisode(activeId, e => ({ items: e.items.filter(i => i.id !== id) }));
  const updateItem = (id, upd) => updateEpisode(activeId, e => ({ items: e.items.map(i => i.id === id ? { ...i, ...upd } : i) }));
  const reorderItems = (newItems) => updateEpisode(activeId, () => ({ items: newItems }));

  const items = activeEpisode?.items || [];
  const quotas = calcQuotas(items);
  const totalSecs = calcTotalTime(items);
  const blockSecs = calcBlockSecs(items);

  // Export helpers
  const buildText = () => {
    let cumSecs = 0, newsIn = false, lines = [];
    lines.push(`RADIO RUNDOWN — ${activeEpisode?.title || 'Episode'}`);
    if (activeEpisode?.guestName) lines.push(`Guest: ${activeEpisode.guestName}`);
    lines.push('', `Danish: ${quotas.danishPct.toFixed(1)}%  |  P6 Beat: ${quotas.p6Pct.toFixed(1)}%`, '', '─'.repeat(40), '');
    items.forEach((item, i) => {
      const start = cumSecs;
      if (!newsIn && start >= HOUR1_END) { lines.push('', '[ NEWS BREAK — 5 min ]', ''); newsIn = true; }
      if (item.type === ITEM_TYPES.SONG) {
        const tags = [item.isDanish&&'DK', item.isP6Beat&&'P6', item.segment==='guest'&&'Guest pick', !item.diskoteketCleared&&'⚠ DISKOTEKET'].filter(Boolean);
        lines.push(`${formatTimestamp(start)}  #${i+1}  ${item.title}${item.artist?' — '+item.artist:''}  [${formatDuration(item.duration)}]${tags.length?'  · '+tags.join(', '):''}`);
      } else {
        lines.push(`${formatTimestamp(start)}  🎙 SPEAK  [${formatDuration(item.duration)}]${item.notes?'  — '+item.notes:''}`);
      }
      cumSecs += item.duration || 0;
    });
    lines.push('', '─'.repeat(40), `Show end: ${formatTimestamp(cumSecs)}`);
    return lines.join('\n');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildText());
    setExportMsg('Copied!'); setTimeout(() => setExportMsg(''), 3000);
    setShowExportMenu(false);
  };
  const handleDownload = () => {
    const blob = new Blob([buildText()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${(activeEpisode?.title||'rundown').replace(/\s+/g,'-').toLowerCase()}.txt`;
    a.click(); URL.revokeObjectURL(url); setShowExportMenu(false);
  };

  const warnings = [];
  const songs = items.filter(i => i.type === ITEM_TYPES.SONG);
  if (quotas.danishPct < 30 && songs.length > 0) warnings.push('Danish quota not met (30%)');
  if (quotas.p6Pct < 30 && songs.length > 0) warnings.push('P6 Beat quota not met (30%)');
  const uncleared = items.filter(i => i.type === ITEM_TYPES.SONG && !i.diskoteketCleared);

  const today = DAYS[new Date().getDay()];
  const nowHour = String(new Date().getHours()).padStart(2,'0');

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{ width:200, flexShrink:0, background:'var(--navy)', display:'flex', flexDirection:'column', borderRight:'1px solid var(--navy-border)' }}>
        {/* Logo */}
        <div style={{ padding:'16px 14px 12px', borderBottom:'1px solid var(--navy-border)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, background:'var(--orange)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:700, color:'white', letterSpacing:'0.03em', flexShrink:0 }}>BR</div>
          <div>
            <div style={{ fontSize:'0.78rem', fontWeight:700, color:'white', letterSpacing:'0.09em' }}>BRIMHEIM</div>
            <div style={{ fontSize:'0.58rem', color:'var(--navy-muted)', letterSpacing:'0.07em' }}>RADIO CONSOLE</div>
          </div>
        </div>

        {/* New episode */}
        <div style={{ padding:'10px 12px 6px' }}>
          <button onClick={createEpisode} style={{ width:'100%', padding:'8px', background:'var(--orange)', color:'white', borderRadius:5, fontSize:'0.75rem', fontWeight:700, letterSpacing:'0.06em' }}>
            + NEW EPISODE
          </button>
        </div>

        {/* Episodes */}
        <div style={{ flex:1, overflow:'auto' }}>
          <div style={{ padding:'8px 14px 4px', fontSize:'0.58rem', color:'var(--navy-muted)', letterSpacing:'0.1em', fontWeight:700 }}>EPISODES</div>
          {episodes.length === 0 && (
            <div style={{ color:'var(--navy-muted)', fontSize:'0.75rem', padding:'14px', textAlign:'center', fontStyle:'italic' }}>No episodes yet</div>
          )}
          {episodes.map(ep => (
            <div key={ep.id} onClick={() => setActiveId(ep.id)} style={{
              padding:'8px 12px 8px 14px', cursor:'pointer',
              borderLeft:`3px solid ${activeId===ep.id?'var(--orange)':'transparent'}`,
              background: activeId===ep.id ? 'rgba(255,255,255,0.07)' : 'transparent',
              display:'flex', justifyContent:'space-between', alignItems:'flex-start',
            }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:'0.78rem', color: activeId===ep.id ? 'white' : 'var(--navy-text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:500 }}>
                  {ep.title || 'Untitled episode'}
                </div>
                <div style={{ fontSize:'0.6rem', color:'var(--navy-muted)', marginTop:2 }}>
                  {fmtEpDate(ep.createdAt)} · {ep.items.length} ITEMS
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); deleteEpisode(ep.id); }} style={{ background:'transparent', color:'var(--navy-muted)', fontSize:'0.72rem', border:'none', paddingLeft:6, flexShrink:0 }}>✕</button>
            </div>
          ))}
        </div>

        {/* On Air */}
        <div style={{ padding:'9px 14px', borderTop:'1px solid var(--navy-border)', fontSize:'0.63rem', color:'var(--navy-muted)', display:'flex', alignItems:'center', gap:6, letterSpacing:'0.05em' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', display:'inline-block', flexShrink:0 }} />
          ON AIR · {today} {nowHour}:00
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'var(--navy)', padding:'13px 22px', display:'flex', alignItems:'center', gap:14, borderBottom:'1px solid var(--navy-border)', flexShrink:0 }}>
          {activeEpisode ? (
            <>
              <div style={{ display:'flex', alignItems:'baseline', gap:10, flex:1, minWidth:0 }}>
                <span style={{ fontSize:'0.62rem', color:'var(--navy-muted)', letterSpacing:'0.1em', fontWeight:700, flexShrink:0 }}>
                  EP · {fmtEpDate(activeEpisode.createdAt)}
                </span>
                <input
                  value={activeEpisode.title}
                  onChange={e => updateEpisode(activeId, () => ({ title: e.target.value }))}
                  placeholder="Episode title"
                  style={{ fontSize:'1.35rem', fontFamily:'Fraunces, serif', fontWeight:400, background:'transparent', border:'none', color:'white', flex:1, padding:0, minWidth:0 }}
                />
              </div>
              <span style={{ fontSize:'0.62rem', color:'var(--navy-muted)', letterSpacing:'0.08em', fontWeight:700, flexShrink:0 }}>GUEST</span>
              <input
                value={activeEpisode.guestName}
                onChange={e => updateEpisode(activeId, () => ({ guestName: e.target.value }))}
                placeholder="Guest artist"
                style={{ width:140, fontSize:'0.82rem', background:'rgba(255,255,255,0.09)', border:'1px solid var(--navy-border)', color:'white', borderRadius:4 }}
              />
              {/* Export */}
              <div style={{ position:'relative', flexShrink:0 }}>
                <button onClick={() => setShowExportMenu(o=>!o)} style={{ padding:'7px 16px', background:'var(--orange)', color:'white', borderRadius:5, fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.08em' }}>
                  {exportMsg || 'EXPORT'}
                </button>
                {showExportMenu && (
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 6px)', background:'var(--navy2)', border:'1px solid var(--navy-border)', borderRadius:6, padding:6, zIndex:200, minWidth:190, boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
                    {[['📋 Copy for Google Doc', handleCopy], ['⬇ Download .txt', handleDownload]].map(([label, fn]) => (
                      <button key={label} onClick={fn} style={{ display:'block', width:'100%', padding:'8px 12px', background:'transparent', color:'var(--navy-text)', fontSize:'0.78rem', textAlign:'left', borderRadius:4, border:'none' }}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.09)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                      >{label}</button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <span style={{ color:'var(--navy-muted)', fontStyle:'italic', fontSize:'0.85rem' }}>Select or create an episode</span>
          )}
        </div>

        {/* Stats bar — light background */}
        {activeEpisode && (
          <div style={{ background:'var(--surface)', padding:'10px 22px', display:'flex', alignItems:'center', borderBottom:'1px solid var(--border)', flexShrink:0, gap:0 }}>
            {/* Total */}
            <div style={{ paddingRight:20, marginRight:20, borderRight:'1px solid var(--border)' }}>
              <div style={{ fontSize:'0.56rem', color:'var(--text-muted)', letterSpacing:'0.1em', fontWeight:700, marginBottom:1 }}>TOTAL</div>
              <div style={{ fontSize:'1.25rem', fontFamily:'Fraunces, serif', color:'var(--text)', lineHeight:1 }}>{formatDuration(totalSecs)}</div>
              <div style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>of 1:55:00</div>
            </div>
            {[1,2].map(h => {
              const used = blockSecs[h-1];
              const rem = 55*60 - used;
              const over = rem < 0;
              const tight = !over && rem < 5*60;
              const col = over ? 'var(--red)' : tight ? 'var(--yellow)' : 'var(--text)';
              return (
                <div key={h} style={{ paddingRight:20, marginRight:20, borderRight:'1px solid var(--border)' }}>
                  <div style={{ fontSize:'0.56rem', color:'var(--text-muted)', letterSpacing:'0.1em', fontWeight:700, marginBottom:1 }}>HOUR {h}</div>
                  <div style={{ fontSize:'1.25rem', fontFamily:'Fraunces, serif', color:col, lineHeight:1 }}>
                    {over ? `+${formatDuration(Math.abs(rem))}` : formatDuration(rem)}
                  </div>
                  <div style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>{formatDuration(used)} used</div>
                </div>
              );
            })}
            {[['DANISH', quotas.danishPct, quotas.danishSecs], ['P6 BEAT', quotas.p6Pct, quotas.p6Secs]].map(([label, pct, secs]) => (
              <div key={label} style={{ paddingRight:20, marginRight:20, borderRight:'1px solid var(--border)' }}>
                <div style={{ fontSize:'0.56rem', color:'var(--text-muted)', letterSpacing:'0.1em', fontWeight:700, marginBottom:1 }}>{label}</div>
                <div style={{ fontSize:'1.25rem', fontFamily:'Fraunces, serif', color: pct>=30 ? 'var(--green)' : 'var(--red)', lineHeight:1 }}>{pct.toFixed(0)}%</div>
                <div style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>min 30% · {formatDuration(secs)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {!activeEpisode ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, background:'var(--bg)' }}>
            <div style={{ fontFamily:'Fraunces, serif', fontSize:'1.8rem', fontWeight:300, color:'var(--text-muted)' }}>No episode open</div>
            <button onClick={createEpisode} style={{ padding:'10px 22px', background:'var(--orange)', color:'white', borderRadius:6, fontSize:'0.9rem', fontWeight:700 }}>+ New Episode</button>
          </div>
        ) : (
          <div style={{ flex:1, overflow:'auto', background:'var(--bg)', padding:'14px 18px' }} onClick={() => setShowExportMenu(false)}>
            {(warnings.length > 0 || uncleared.length > 0) && (
              <div style={{ marginBottom:10, display:'flex', flexDirection:'column', gap:5 }}>
                {warnings.map(w => (
                  <div key={w} style={{ background:'rgba(192,48,48,0.1)', border:'1px solid var(--red)', borderRadius:5, padding:'6px 12px', fontSize:'0.78rem', color:'var(--red)' }}>⚠ {w}</div>
                ))}
                {uncleared.length > 0 && (
                  <div style={{ background:'rgba(176,128,32,0.1)', border:'1px solid var(--yellow)', borderRadius:5, padding:'6px 12px', fontSize:'0.78rem', color:'var(--yellow)' }}>
                    ⚠ {uncleared.length} song{uncleared.length>1?'s':''} not cleared in Diskoteket: {uncleared.map(s=>s.title||'Untitled').join(', ')}
                  </div>
                )}
              </div>
            )}
            <Rundown items={items} onReorder={reorderItems} onRemove={removeItem} onUpdate={updateItem} onAdd={addItem} />
          </div>
        )}
      </div>
    </div>
  );
}
