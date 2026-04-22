import React, { useState } from 'react';
import { formatDuration, formatTimestamp, ITEM_TYPES, HOUR1_END } from '../utils';

export default function ExportPanel({ items, quotas, episodeTitle, guestName }) {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');

  const buildDocText = () => {
    let cumSecs = 0;
    let newsInserted = false;
    let lines = [];

    lines.push(`RADIO RUNDOWN — ${episodeTitle || 'Episode'}`);
    if (guestName) lines.push(`Guest: ${guestName}`);
    lines.push('');
    lines.push(`Danish: ${quotas.danishPct.toFixed(1)}%  |  P6 Beat: ${quotas.p6Pct.toFixed(1)}%`);
    lines.push('');
    lines.push('────────────────────────────────────────');
    lines.push('');

    items.forEach((item, i) => {
      const start = cumSecs;
      if (!newsInserted && start >= HOUR1_END) {
        lines.push('');
        lines.push('[ NEWS BREAK — 5 min ]');
        lines.push('');
        newsInserted = true;
      }

      if (item.type === ITEM_TYPES.SONG) {
        const tags = [];
        if (item.isDanish) tags.push('DK');
        if (item.isP6Beat) tags.push('P6');
        if (item.isGuest) tags.push('Guest pick');
        if (!item.diskoteketCleared) tags.push('⚠ CHECK DISKOTEKET');
        lines.push(`${formatTimestamp(start)}  #${i + 1}  ${item.title}${item.artist ? ' — ' + item.artist : ''}  [${formatDuration(item.duration)}]${tags.length ? '  · ' + tags.join(', ') : ''}`);
        if (item.notes) lines.push(`       ${item.notes}`);
      } else {
        lines.push(`${formatTimestamp(start)}  🎙 SPEAK  [${formatDuration(item.duration)}]${item.notes ? '  — ' + item.notes : ''}`);
      }

      cumSecs += item.duration || 0;
    });

    lines.push('');
    lines.push('────────────────────────────────────────');
    lines.push(`Show end: ${formatTimestamp(cumSecs)}`);
    return lines.join('\n');
  };

  const copyToClipboard = async () => {
    const text = buildDocText();
    await navigator.clipboard.writeText(text);
    setStatus('Copied! Paste into a new Google Doc.');
    setTimeout(() => setStatus(''), 4000);
  };

  const downloadTxt = () => {
    const text = buildDocText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(episodeTitle || 'rundown').replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const btnStyle = {
    padding: '8px 16px',
    borderRadius: 5,
    fontSize: '0.82rem',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.15s',
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
      <div style={{ marginBottom: 14, fontFamily: 'Fraunces, serif', fontSize: '1.05rem', fontWeight: 300, color: 'var(--accent)' }}>
        Export
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={copyToClipboard} style={{ ...btnStyle, background: 'var(--accent2)', color: '#0e0e0e' }}>
          📋 Copy for Google Doc
        </button>
        <button onClick={downloadTxt} style={{ ...btnStyle, background: 'var(--surface3)', color: 'var(--text)', border: '1px solid var(--border)' }}>
          ⬇ Download .txt
        </button>
      </div>
      {status && (
        <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--green)' }}>{status}</div>
      )}
      <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Copy → open a new Google Doc → paste. Formatting is clean and ready to use.
      </div>
    </div>
  );
}
