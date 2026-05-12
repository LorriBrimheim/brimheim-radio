import React, { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDuration, ITEM_TYPES, MAX_SPEAK, parseDuration } from '../utils';

const DURATION_PRESETS = ['0:30','1:00','1:30','2:00','3:00','3:30','4:00','4:30','5:00'];

function useDebounce(value, delay) {
  const [deb, setDeb] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDeb(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return deb;
}

function ToggleBadgeComp({ label, active, color, onClick, disabled, title }) {
  return (
    <button onClick={disabled ? undefined : onClick} title={title} style={{
      padding: '2px 7px', borderRadius: 20, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.04em',
      cursor: disabled ? 'default' : 'pointer',
      background: active ? color : 'transparent',
      color: active ? 'white' : disabled ? 'var(--border)' : 'var(--text-muted)',
      border: `1px solid ${active ? color : disabled ? 'var(--border-light)' : 'var(--border)'}`,
      transition: 'all 0.12s',
    }}>{label}</button>
  );
}

export default function RundownItem({ item, rowNum, onRemove, onUpdate, cumSecs }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const isSong = item.type === ITEM_TYPES.SONG;
  const isSpeak = item.type === ITEM_TYPES.SPEAK;
  const isSpeakOver = isSpeak && item.duration > MAX_SPEAK;
  const isGuest = item.segment === 'guest';

  const [durStr, setDurStr] = useState(item.duration > 0 ? formatDuration(item.duration) : '');
  const [titleArtist, setTitleArtist] = useState(
    isSong ? `${item.title||''}${item.artist?' — '+item.artist:''}` : (item.notes||'')
  );
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [memoText, setMemoText] = useState(item.memo || '');
  const dropdownRef = useRef(null);
  const presetsRef = useRef(null);
  const memoRef = useRef(null);

  const debouncedQuery = useDebounce(isSong ? titleArtist : '', 420);

  useEffect(() => {
    setTitleArtist(item.type === ITEM_TYPES.SONG
      ? `${item.title||''}${item.artist?' — '+item.artist:''}` : (item.notes||''));
  }, [item.type]);

  useEffect(() => { setDurStr(item.duration > 0 ? formatDuration(item.duration) : ''); }, [item.id]);
  useEffect(() => { setMemoText(item.memo || ''); setShowNotes(false); }, [item.id]);

  useEffect(() => {
    if (!isSong || debouncedQuery.length < 3) { setSearchResults([]); setShowDropdown(false); return; }
    setSearching(true);
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(debouncedQuery)}&entity=song&limit=7&country=dk`)
      .then(r => r.json())
      .then(data => {
        const res = (data.results||[]).map(r => ({ title:r.trackName, artist:r.artistName, duration:Math.round(r.trackTimeMillis/1000) }));
        setSearchResults(res); setShowDropdown(res.length > 0);
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery, isSong]);

  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
      if (presetsRef.current && !presetsRef.current.contains(e.target)) setShowPresets(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (showNotes && memoRef.current) memoRef.current.focus();
  }, [showNotes]);

  const selectResult = (r) => {
    onUpdate(item.id, { title:r.title, artist:r.artist, duration:r.duration });
    setTitleArtist(`${r.title} — ${r.artist}`); setDurStr(formatDuration(r.duration));
    setShowDropdown(false); setSearchResults([]);
  };

  const update = (f, v) => onUpdate(item.id, { [f]: v });
  const saveMemo = () => update('memo', memoText);

  const handleTitleBlur = () => {
    if (isSong) { const p = titleArtist.split(' — '); onUpdate(item.id, { title:p[0].trim(), artist:p.slice(1).join(' — ').trim() }); }
    else update('notes', titleArtist);
  };

  const handleDurBlur = () => {
    const secs = parseDuration(durStr);
    update('duration', secs); setDurStr(secs > 0 ? formatDuration(secs) : '');
  };

  const toggleGuest = () => { const ng = isGuest ? 'solo' : 'guest'; onUpdate(item.id, { segment:ng, isGuest: ng==='guest' }); };

  const timestamp = formatDuration(cumSecs);
  const hasMemo = !!(item.memo?.trim());

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}>
      {/* ── Main row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '18px 44px 1fr 46px 28px 28px 26px 20px 18px',
        gap: 4, alignItems: 'center',
        padding: '6px 10px',
        background: isSpeakOver ? 'rgba(192,48,48,0.05)' : rowNum % 2 === 0 ? 'var(--surface)' : 'var(--surface2)',
        borderBottom: showNotes ? 'none' : '1px solid var(--border-light)',
      }}>

        {/* Drag */}
        <div {...attributes} {...listeners} title={`${timestamp} — drag to reorder`}
          style={{ cursor: isDragging?'grabbing':'grab', color:'#8a857a', fontSize:'0.85rem', textAlign:'center', touchAction:'none', userSelect:'none' }}>⠿</div>

        {/* Row num + timestamp */}
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text-dim)', fontVariantNumeric:'tabular-nums' }}>{String(rowNum).padStart(2,'0')}</div>
          <div style={{ fontSize:'0.57rem', color:'var(--text-muted)', fontVariantNumeric:'tabular-nums', marginTop:1 }}>{timestamp}</div>
        </div>

        {/* Content */}
        <div ref={dropdownRef} style={{ position:'relative', minWidth:0 }}>
          {isSpeak ? (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ background:'#6840a8', color:'white', fontSize:'0.57rem', fontWeight:700, padding:'2px 8px', borderRadius:20, letterSpacing:'0.05em', flexShrink:0 }}>SPEAK</span>
              <input value={titleArtist} onChange={e=>setTitleArtist(e.target.value)} onBlur={handleTitleBlur}
                placeholder="Speak topic..."
                style={{ fontSize:'0.78rem', padding:'2px 4px', width:'100%', background:'transparent', border:'none', borderBottom:'1px solid var(--border)', borderRadius:0, color:'var(--text-dim)' }} />
            </div>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:0 }}>
                <input value={titleArtist}
                  onChange={e=>{ setTitleArtist(e.target.value); if(e.target.value.length>=3) setShowDropdown(true); }}
                  onBlur={handleTitleBlur}
                  onKeyDown={e=>{ if(e.key==='Escape') setShowDropdown(false); }}
                  placeholder="Title — Artist"
                  style={{ fontSize:'0.8rem', padding:'2px 4px', flex:1, minWidth:0, background:'transparent', border:'none', borderBottom:'1px solid var(--border)', borderRadius:0, color:'var(--text)' }} />
                {searching && <span style={{ fontSize:'0.6rem', color:'var(--text-muted)', flexShrink:0 }}>···</span>}
                <button onClick={toggleGuest}
                  title={isGuest ? 'Guest pick — click to remove' : 'Click to mark as guest pick'}
                  style={{
                    background: isGuest ? 'var(--orange)' : 'transparent',
                    color: isGuest ? 'white' : '#9a7060',
                    fontSize:'0.57rem', fontWeight:700, padding:'1px 5px', borderRadius:10,
                    letterSpacing:'0.04em', flexShrink:0,
                    border:`1px solid ${isGuest?'var(--orange)':'#c0a898'}`,
                    cursor:'pointer', transition:'all 0.12s',
                  }}
                  onMouseEnter={e=>{ if(!isGuest){e.currentTarget.style.borderColor='var(--orange)';e.currentTarget.style.color='var(--orange)';} }}
                  onMouseLeave={e=>{ if(!isGuest){e.currentTarget.style.borderColor='#c0a898';e.currentTarget.style.color='#9a7060';} }}
                >{isGuest ? 'GUEST PICK' : 'GP'}</button>
              </div>

              {showDropdown && searchResults.length > 0 && (
                <div style={{ position:'absolute', top:'calc(100% + 2px)', left:0, right:0, background:'var(--surface3)', border:'1px solid var(--orange)', borderRadius:5, zIndex:200, boxShadow:'0 6px 20px rgba(0,0,0,0.15)', overflow:'hidden' }}>
                  {searchResults.map((r,i) => (
                    <div key={i} onMouseDown={e=>{e.preventDefault();selectResult(r);}}
                      style={{ padding:'7px 10px', cursor:'pointer', borderBottom: i<searchResults.length-1?'1px solid var(--border)':'none', display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--surface)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:'0.8rem', color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.title}</div>
                        <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.artist}</div>
                      </div>
                      <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', flexShrink:0, fontVariantNumeric:'tabular-nums' }}>{formatDuration(r.duration)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Duration */}
        <div ref={presetsRef} style={{ position:'relative' }}>
          <input value={durStr} onChange={e=>setDurStr(e.target.value)} onFocus={()=>setShowPresets(true)} onBlur={handleDurBlur}
            onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}} placeholder="0:00"
            style={{ fontSize:'0.75rem', padding:'2px 4px', textAlign:'center', width:'100%', fontVariantNumeric:'tabular-nums' }} />
          {showPresets && (
            <div style={{ position:'absolute', top:'calc(100% + 2px)', left:'50%', transform:'translateX(-50%)', background:'var(--surface3)', border:'1px solid var(--border)', borderRadius:5, padding:6, zIndex:200, display:'flex', flexWrap:'wrap', gap:3, width:158, boxShadow:'0 4px 16px rgba(0,0,0,0.15)' }}>
              <div style={{ width:'100%', fontSize:'0.57rem', color:'var(--text-muted)', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.06em' }}>Quick fill</div>
              {DURATION_PRESETS.map(p => (
                <button key={p} onMouseDown={e=>{e.preventDefault();const s=parseDuration(p);update('duration',s);setDurStr(p);setShowPresets(false);}}
                  style={{ padding:'3px 7px', background:'var(--surface)', color:'var(--text-dim)', borderRadius:3, fontSize:'0.7rem', border:'1px solid var(--border)', cursor:'pointer' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='var(--orange)';e.currentTarget.style.color='white';e.currentTarget.style.borderColor='var(--orange)';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='var(--surface)';e.currentTarget.style.color='var(--text-dim)';e.currentTarget.style.borderColor='var(--border)';}}
                >{p}</button>
              ))}
            </div>
          )}
        </div>

        {/* DK */}
        <ToggleBadgeComp label="DK" active={!!item.isDanish} color="#1a7a52"
          onClick={isSong ? ()=>update('isDanish',!item.isDanish) : undefined}
          disabled={!isSong}
          title={isSong?(item.isDanish?'Danish — click to remove':'Mark as Danish'):''} />

        {/* P6 */}
        <ToggleBadgeComp label="P6" active={!!item.isP6Beat} color="#2e5aaa"
          onClick={isSong ? ()=>update('isP6Beat',!item.isP6Beat) : undefined}
          disabled={!isSong}
          title={isSong?(item.isP6Beat?'P6 Beat — click to remove':'Mark as P6 Beat'):''} />

        {/* Diskoteket */}
        {isSong ? (
          <button onClick={()=>update('diskoteketCleared',!item.diskoteketCleared)}
            title={item.diskoteketCleared?'Cleared in Diskoteket':'Not cleared — click to mark'}
            style={{ background:'transparent', fontSize:'0.7rem', fontWeight:700, padding:'1px 3px', borderRadius:3,
              border:`1px solid ${item.diskoteketCleared?'var(--green)':'var(--red)'}`,
              color:item.diskoteketCleared?'var(--green)':'var(--red)', cursor:'pointer', lineHeight:1 }}>
            {item.diskoteketCleared?'✓':'!'}
          </button>
        ) : <span style={{ color:'var(--border)', fontSize:'0.7rem', textAlign:'center' }}>—</span>}

        {/* Notes pencil */}
        <button onClick={() => setShowNotes(o => !o)}
          title={hasMemo ? 'View/edit notes' : 'Add notes'}
          style={{
            background: showNotes ? 'rgba(46,90,170,0.12)' : hasMemo ? 'rgba(46,90,170,0.08)' : 'transparent',
            color: (hasMemo || showNotes) ? '#2e5aaa' : '#8090b0',
            padding:'2px 4px', borderRadius:3, fontSize:'0.78rem', fontWeight: hasMemo ? 700 : 400,
            border: `1px solid ${(showNotes || hasMemo) ? '#8090c8' : '#b0bcd8'}`,
            lineHeight:1, transition:'all 0.12s', position:'relative',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.color='#2e5aaa'; e.currentTarget.style.background='rgba(46,90,170,0.12)'; e.currentTarget.style.borderColor='#2e5aaa'; }}
          onMouseLeave={e=>{ e.currentTarget.style.color=(hasMemo||showNotes)?'#2e5aaa':'#8090b0'; e.currentTarget.style.background=showNotes?'rgba(46,90,170,0.12)':hasMemo?'rgba(46,90,170,0.08)':'transparent'; e.currentTarget.style.borderColor=(showNotes||hasMemo)?'#8090c8':'#b0bcd8'; }}
        >
          ✎{hasMemo && <span style={{ position:'absolute', top:-1, right:-1, width:5, height:5, borderRadius:'50%', background:'#2e5aaa', display:'block' }} />}
        </button>

        {/* Delete */}
        <button onClick={()=>onRemove(item.id)}
          style={{ background:'transparent', color:'#a09890', padding:'2px 3px', borderRadius:3, fontSize:'0.85rem', border:'1px solid transparent', lineHeight:1 }}
          onMouseEnter={e=>{e.currentTarget.style.color='var(--red)';e.currentTarget.style.borderColor='var(--border)';}}
          onMouseLeave={e=>{e.currentTarget.style.color='#a09890';e.currentTarget.style.borderColor='transparent';}}>×</button>
      </div>

      {/* ── Notes panel ── */}
      {showNotes && (
        <div style={{
          padding:'8px 10px 10px 76px',
          background: rowNum % 2 === 0 ? 'var(--surface)' : 'var(--surface2)',
          borderBottom:'2px solid #8090c8',
          borderTop:'1px solid var(--border-light)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
            <span style={{ fontSize:'0.55rem', color:'#2e5aaa', fontWeight:700, letterSpacing:'0.1em' }}>PREP NOTES</span>
            {hasMemo && <span style={{ fontSize:'0.55rem', color:'var(--text-muted)' }}>· saved</span>}
          </div>
          <textarea ref={memoRef}
            value={memoText}
            onChange={e => setMemoText(e.target.value)}
            onBlur={saveMemo}
            placeholder={isSong
              ? 'Fun facts, talking points, why you chose this song, questions sparked by it…'
              : 'Questions for guest, bullet points to cover, background info…'}
            rows={3}
            style={{
              width:'100%', resize:'vertical', fontSize:'0.78rem',
              padding:'7px 10px', background:'white',
              border:'1px solid #b0bcd8', borderRadius:5,
              color:'var(--text-dim)', fontFamily:'inherit', lineHeight:1.6,
              minHeight:62, outline:'none',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#2e5aaa'}
            onBlur={e => { e.currentTarget.style.borderColor = '#b0bcd8'; saveMemo(); }}
          />
        </div>
      )}
    </div>
  );
}
