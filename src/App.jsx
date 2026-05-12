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
  createdAt: new Date().toISOString(), generalNotes: '',
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
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY + '_sidebar') !== 'false'; } catch { return true; }
  });
  const [editingDate, setEditingDate] = useState(false);

  const activeEpisode = episodes.find(e => e.id === activeId) || null;

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(episodes)); }, [episodes]);
  useEffect(() => { if (activeId) localStorage.setItem(STORAGE_KEY + '_active', activeId); }, [activeId]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY + '_sidebar', String(sidebarOpen)); }, [sidebarOpen]);
  useEffect(() => { setEditingDate(false); }, [activeId]);

  const toDateInput = (iso) => {
    try { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
    catch { return ''; }
  };

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
  const buildNotes = () => {
    const div = '─'.repeat(44);
    const lines = [];
    const ep = activeEpisode;

    lines.push(`SHOW NOTES  —  ${ep?.title || 'Episode'}`);
    lines.push(`${fmtEpDate(ep?.createdAt)}${ep?.guestName ? '  ·  Guest: ' + ep.guestName : ''}`);
    lines.push('');

    const h1 = items.filter(i => (i.hour || 1) === 1);
    const h2 = items.filter(i => (i.hour || 1) === 2);

    const renderHourNotes = (hourItems, hourNum) => {
      const withNotes = hourItems.filter(i => i.memo?.trim());
      if (!withNotes.length) return;
      lines.push(`HOUR ${hourNum}`);
      lines.push(div);
      withNotes.forEach((item, noteIdx) => {
        const num = String(noteIdx + 1).padStart(2, '0');
        const label = item.type === ITEM_TYPES.SONG
          ? `#${num}  ${item.title || 'Untitled'}${item.artist ? '  —  ' + item.artist : ''}`
          : `#${num}  SPEAK${item.notes ? ':  ' + item.notes : ''}`;
        lines.push(label);
        item.memo.trim().split('\n').forEach(l => lines.push(`     ${l}`));
        lines.push('');
      });
    };

    const anyItemNotes = items.some(i => i.memo?.trim());
    if (anyItemNotes) {
      renderHourNotes(h1, 1);
      renderHourNotes(h2, 2);
    } else {
      lines.push('(no item notes added yet)', '');
    }

    const gn = ep?.generalNotes?.trim();
    if (gn) {
      lines.push(`GENERAL NOTES`);
      lines.push(div);
      gn.split('\n').forEach(l => lines.push(l));
    }

    return lines.join('\n');
  };

  const buildText = () => {
    const div = '─'.repeat(44);
    const lines = [];
    const ep = activeEpisode;

    lines.push(`RADIO RUNDOWN  —  ${ep?.title || 'Episode'}`);
    lines.push(`${fmtEpDate(ep?.createdAt)}${ep?.guestName ? '  ·  Guest: ' + ep.guestName : ''}`);
    lines.push(`Danish: ${quotas.danishPct.toFixed(1)}%   P6 Beat: ${quotas.p6Pct.toFixed(1)}%`);
    lines.push('');

    const h1 = items.filter(i => (i.hour || 1) === 1);
    const h2 = items.filter(i => (i.hour || 1) === 2);

    const renderHour = (hourItems, hourNum, startSecs) => {
      lines.push(`HOUR ${hourNum}`);
      lines.push(div);
      let cur = startSecs;
      hourItems.forEach((item, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        const ts = formatTimestamp(cur).padEnd(6);
        if (item.type === ITEM_TYPES.SONG) {
          const tags = [item.isDanish&&'DK', item.isP6Beat&&'P6', item.segment==='guest'&&'GP', !item.diskoteketCleared&&'⚠ DISK'].filter(Boolean);
          const tagStr = tags.length ? `  [${tags.join(' · ')}]` : '';
          lines.push(`${ts}  #${num}  ${item.title || 'Untitled'}${item.artist ? '  —  ' + item.artist : ''}  ${formatDuration(item.duration)}${tagStr}`);
        } else {
          lines.push(`${ts}  #${num}  🎙 SPEAK  ${formatDuration(item.duration)}${item.notes ? '  —  ' + item.notes : ''}`);
        }
        cur += item.duration || 0;
      });
      lines.push('');
      return cur;
    };

    const afterH1 = renderHour(h1, 1, 0);
    lines.push(`  ·  NEWS BREAK  55:00 → 60:00  ·`);
    lines.push('');
    renderHour(h2, 2, afterH1 + (5 * 60));
    lines.push(div);
    lines.push(`Total  ${formatDuration(items.reduce((s, i) => s + (i.duration || 0), 0))}`);
    return lines.join('\n');
  };

  const buildNotesHtml = () => {
    const ep = activeEpisode;
    const h1 = items.filter(i => (i.hour || 1) === 1);
    const h2 = items.filter(i => (i.hour || 1) === 2);
    let html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;color:#1a1814;line-height:1.5;">`;
    html += `<p style="font-size:1.15em;font-weight:700;margin:0 0 2px;">${ep?.title || 'Episode'}</p>`;
    html += `<p style="color:#888;font-size:0.88em;margin:0 0 20px;">${fmtEpDate(ep?.createdAt)}${ep?.guestName ? '&nbsp;·&nbsp;Guest: <strong>' + ep.guestName + '</strong>' : ''}</p>`;
    const renderHour = (hourItems, hourNum) => {
      const withNotes = hourItems.filter(i => i.memo?.trim());
      if (!withNotes.length) return;
      html += `<p style="font-size:0.72em;font-weight:700;letter-spacing:0.1em;color:#888;text-transform:uppercase;margin:24px 0 4px;">HOUR ${hourNum}</p>`;
      html += `<hr style="border:none;border-top:1px solid #ddd;margin:0 0 14px;">`;
      withNotes.forEach((item, noteIdx) => {
        const num = String(noteIdx + 1).padStart(2, '0');
        const title = item.type === ITEM_TYPES.SONG
          ? `#${num}&nbsp;&nbsp;<strong>${item.title || 'Untitled'}</strong>${item.artist ? `&nbsp;—&nbsp;<span style="font-weight:400;">${item.artist}</span>` : ''}`
          : `#${num}&nbsp;&nbsp;<strong>SPEAK</strong>${item.notes ? `&nbsp;—&nbsp;<span style="font-weight:400;">${item.notes}</span>` : ''}`;
        html += `<p style="margin:0 0 5px;">${title}</p>`;
        const escaped = item.memo.trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>');
        html += `<p style="margin:0 0 18px;padding-left:22px;color:#3a6aaa;font-style:italic;">${escaped}</p>`;
      });
    };
    const anyItemNotes = items.some(i => i.memo?.trim());
    if (anyItemNotes) { renderHour(h1, 1); renderHour(h2, 2); }
    else { html += `<p style="color:#aaa;font-style:italic;">(no item notes added yet)</p>`; }
    const gn = ep?.generalNotes?.trim();
    if (gn) {
      html += `<p style="font-size:0.72em;font-weight:700;letter-spacing:0.1em;color:#888;text-transform:uppercase;margin:24px 0 4px;">GENERAL NOTES</p>`;
      html += `<hr style="border:none;border-top:1px solid #ddd;margin:0 0 14px;">`;
      html += `<p style="color:#3a6aaa;font-style:italic;">${gn.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</p>`;
    }
    html += `</div>`;
    return html;
  };

  const buildBoth = () => buildText() + '\n\n\n' + buildNotes();

  const doCopy = async (text) => {
    await navigator.clipboard.writeText(text);
    setExportMsg('Copied!'); setTimeout(() => setExportMsg(''), 3000);
    setShowExportMenu(false);
  };
  const doCopyRich = (html, plain) => {
    // Render into a hidden offscreen div, select it, execCommand('copy')
    // — this is the reliable cross-browser way to put rich text on the clipboard
    const el = document.createElement('div');
    el.innerHTML = html;
    Object.assign(el.style, { position:'fixed', left:'-9999px', top:'0', opacity:'0', pointerEvents:'none' });
    document.body.appendChild(el);
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch {}
    sel.removeAllRanges();
    document.body.removeChild(el);
    if (!ok) navigator.clipboard.writeText(plain).catch(() => {});
    setExportMsg('Copied!'); setTimeout(() => setExportMsg(''), 3000);
    setShowExportMenu(false);
  };
  const doDownload = (text, suffix = '') => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    const base = (activeEpisode?.title || 'rundown').replace(/\s+/g, '-').toLowerCase();
    a.download = `${base}${suffix}.txt`;
    a.click(); URL.revokeObjectURL(url); setShowExportMenu(false);
  };
  const doDownloadHtml = (html, suffix = '') => {
    const full = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Show Notes</title><style>body{margin:40px auto;max-width:700px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}</style></head><body>${html}</body></html>`;
    const blob = new Blob([full], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    const base = (activeEpisode?.title || 'notes').replace(/\s+/g, '-').toLowerCase();
    a.download = `${base}${suffix}.html`;
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
      <div style={{ width: sidebarOpen ? 160 : 44, flexShrink:0, background:'var(--navy)', display:'flex', flexDirection:'column', borderRight:'1px solid var(--navy-border)', transition:'width 0.18s ease', overflow:'hidden' }}>

        {/* Logo row */}
        <div style={{ padding:'12px 8px', borderBottom:'1px solid var(--navy-border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, minWidth: sidebarOpen ? 160 : 44 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
            <div style={{ width:28, height:28, background:'var(--orange)', borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.68rem', fontWeight:700, color:'white', flexShrink:0 }}>BR</div>
            {sidebarOpen && <div style={{ minWidth:0 }}>
              <div style={{ fontSize:'0.72rem', fontWeight:700, color:'white', letterSpacing:'0.09em', whiteSpace:'nowrap' }}>BRIMHEIM</div>
              <div style={{ fontSize:'0.52rem', color:'var(--navy-muted)', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>RADIO CONSOLE</div>
            </div>}
          </div>
          <button onClick={() => setSidebarOpen(o => !o)} title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            style={{ background:'transparent', color:'var(--navy-muted)', border:'none', fontSize:'0.9rem', padding:'2px 4px', lineHeight:1, cursor:'pointer', flexShrink:0 }}>
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        {sidebarOpen && <>
          {/* New episode */}
          <div style={{ padding:'8px 10px 5px', flexShrink:0 }}>
            <button onClick={createEpisode} style={{ width:'100%', padding:'7px', background:'var(--orange)', color:'white', borderRadius:5, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.05em' }}>
              + NEW EPISODE
            </button>
          </div>

          {/* Episodes */}
          <div style={{ flex:1, overflow:'auto' }}>
            <div style={{ padding:'7px 12px 3px', fontSize:'0.55rem', color:'var(--navy-muted)', letterSpacing:'0.1em', fontWeight:700 }}>EPISODES</div>
            {episodes.length === 0 && (
              <div style={{ color:'var(--navy-muted)', fontSize:'0.72rem', padding:'12px', textAlign:'center', fontStyle:'italic' }}>No episodes yet</div>
            )}
            {episodes.map(ep => (
              <div key={ep.id} onClick={() => setActiveId(ep.id)} style={{
                padding:'7px 8px 7px 10px', cursor:'pointer',
                borderLeft:`3px solid ${activeId===ep.id?'var(--orange)':'transparent'}`,
                background: activeId===ep.id ? 'rgba(255,255,255,0.07)' : 'transparent',
                display:'flex', justifyContent:'space-between', alignItems:'flex-start',
              }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:'0.73rem', color: activeId===ep.id ? 'white' : 'var(--navy-text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:500 }}>
                    {ep.title || 'Untitled episode'}
                  </div>
                  <div style={{ fontSize:'0.57rem', color:'var(--navy-muted)', marginTop:1 }}>
                    {fmtEpDate(ep.createdAt)} · {ep.items.length} items
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteEpisode(ep.id); }} style={{ background:'transparent', color:'var(--navy-muted)', fontSize:'0.68rem', border:'none', paddingLeft:4, flexShrink:0 }}>✕</button>
              </div>
            ))}
          </div>

          {/* On Air */}
          <div style={{ padding:'8px 12px', borderTop:'1px solid var(--navy-border)', fontSize:'0.6rem', color:'var(--navy-muted)', display:'flex', alignItems:'center', gap:5, letterSpacing:'0.05em', flexShrink:0 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)', display:'inline-block', flexShrink:0 }} />
            ON AIR · {today} {nowHour}:00
          </div>
        </>}
      </div>

      {/* ── Main ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ background:'white', padding:'12px 22px', display:'flex', alignItems:'center', gap:14, borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          {activeEpisode ? (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
                {editingDate ? (
                  <input type="date" autoFocus
                    defaultValue={toDateInput(activeEpisode.createdAt)}
                    onBlur={e => { if (e.target.value) { const p = e.target.value.split('-'); updateEpisode(activeId, () => ({ createdAt: new Date(+p[0], +p[1]-1, +p[2]).toISOString() })); } setEditingDate(false); }}
                    onKeyDown={e => { if (e.key==='Escape'||e.key==='Enter') e.target.blur(); }}
                    style={{ fontSize:'0.7rem', padding:'1px 6px', background:'var(--surface)', border:'1px solid var(--orange)', borderRadius:3, color:'var(--text)', flexShrink:0 }}
                  />
                ) : (
                  <span onClick={() => setEditingDate(true)} title="Click to edit date"
                    style={{ fontSize:'0.6rem', color:'var(--text-muted)', letterSpacing:'0.12em', fontWeight:700, flexShrink:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:3, padding:'2px 6px', cursor:'pointer' }}>
                    EP · {fmtEpDate(activeEpisode.createdAt)} ✎
                  </span>
                )}
                <input
                  value={activeEpisode.title}
                  onChange={e => updateEpisode(activeId, () => ({ title: e.target.value }))}
                  placeholder="Episode title"
                  style={{ fontSize:'1.55rem', fontFamily:'Fraunces, serif', fontWeight:700, background:'transparent', border:'none', color:'var(--text)', flex:1, padding:0, minWidth:0 }}
                />
              </div>
              <span style={{ fontSize:'0.6rem', color:'var(--text-muted)', letterSpacing:'0.1em', fontWeight:700, flexShrink:0 }}>GUEST</span>
              <input
                value={activeEpisode.guestName}
                onChange={e => updateEpisode(activeId, () => ({ guestName: e.target.value }))}
                placeholder="Guest artist"
                style={{ width:140, fontSize:'0.82rem', background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text)', borderRadius:4 }}
              />
              {/* Export */}
              <div style={{ position:'relative', flexShrink:0 }}>
                <button onClick={() => setShowExportMenu(o=>!o)} style={{ padding:'7px 16px', background:'var(--orange)', color:'white', borderRadius:5, fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.08em' }}>
                  {exportMsg || 'EXPORT'}
                </button>
                {showExportMenu && (
                  <div style={{ position:'absolute', right:0, top:'calc(100% + 6px)', background:'white', border:'1px solid var(--border)', borderRadius:6, padding:'6px 0', zIndex:200, minWidth:210, boxShadow:'0 8px 24px rgba(0,0,0,0.15)' }}>
                    {[
                      { section: 'RUNDOWN', items: [['📋 Copy', () => doCopy(buildText())], ['⬇ Download .txt', () => doDownload(buildText())]] },
                      { section: 'NOTES', items: [['📋 Copy (formatted)', () => doCopyRich(buildNotesHtml(), buildNotes())], ['⬇ Download .html', () => doDownloadHtml(buildNotesHtml(), '-notes')]] },
                      { section: 'RUNDOWN + NOTES', items: [['📋 Copy both', () => doCopyRich('<pre style="font-family:monospace;font-size:0.85em;color:#333;">' + buildText().replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</pre><br><hr><br>' + buildNotesHtml(), buildBoth())], ['⬇ Download .html', () => doDownloadHtml('<pre style="font-family:monospace;font-size:0.85em;color:#333;white-space:pre-wrap;">' + buildText().replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</pre><hr>' + buildNotesHtml(), '-full')]] },
                    ].map(({ section, items: btns }, si) => (
                      <div key={section}>
                        {si > 0 && <div style={{ height:1, background:'var(--border)', margin:'4px 0' }} />}
                        <div style={{ fontSize:'0.52rem', color:'var(--text-muted)', letterSpacing:'0.1em', fontWeight:700, padding:'4px 14px 2px' }}>{section}</div>
                        {btns.map(([label, fn]) => (
                          <button key={label} onClick={fn} style={{ display:'block', width:'100%', padding:'6px 14px', background:'transparent', color:'var(--text-dim)', fontSize:'0.78rem', textAlign:'left', border:'none' }}
                            onMouseEnter={e=>e.currentTarget.style.background='var(--surface)'}
                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                          >{label}</button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <span style={{ color:'var(--text-muted)', fontStyle:'italic', fontSize:'0.85rem' }}>Select or create an episode</span>
          )}
        </div>

        {/* Stats bar — light background */}
        {activeEpisode && (
          <div style={{ background:'white', padding:'10px 22px', display:'flex', alignItems:'center', borderBottom:'1px solid var(--border)', flexShrink:0, gap:0 }}>
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

            {/* ── General Notes ── */}
            <div style={{ marginTop:20, paddingTop:16, borderTop:'2px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:'0.6rem', color:'#2e5aaa', fontWeight:700, letterSpacing:'0.1em' }}>✎ SHOW NOTES</span>
                <span style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>general ideas, guest questions, anything</span>
              </div>
              <textarea
                value={activeEpisode.generalNotes || ''}
                onChange={e => updateEpisode(activeId, () => ({ generalNotes: e.target.value }))}
                placeholder={'Guest questions to ask...\nFun facts to mention...\nIdeas for transitions...\nAnything on your mind before the show...'}
                rows={5}
                style={{
                  width:'100%', resize:'vertical', fontSize:'0.82rem',
                  padding:'10px 14px', background:'white',
                  border:'1px solid #b0bcd8', borderRadius:6,
                  color:'var(--text-dim)', fontFamily:'inherit', lineHeight:1.65,
                  minHeight:100, outline:'none',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#2e5aaa'}
                onBlur={e => e.currentTarget.style.borderColor = '#b0bcd8'}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
