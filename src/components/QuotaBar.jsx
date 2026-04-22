import React from 'react';
import { formatDuration } from '../utils';

const Bar = ({ label, pct, target, secs, color }) => {
  const met = pct >= target;
  const width = Math.min(pct, 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.82rem', color: met ? 'var(--green)' : 'var(--yellow)', fontWeight: 600 }}>
          {pct.toFixed(1)}%
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> / {target}% min</span>
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{formatDuration(secs)}</span>
        </span>
      </div>
      <div style={{ height: 7, background: 'var(--surface3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${width}%`,
          background: met ? color : 'var(--yellow)',
          borderRadius: 4,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
};

export default function QuotaBar({ quotas, totalSecs, blockSecs }) {
  const { danishPct, p6Pct, danishSecs, p6Secs, totalSongSecs } = quotas;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: 20,
    }}>
      <div style={{ marginBottom: 18, fontFamily: 'Fraunces, serif', fontSize: '1.1rem', fontWeight: 400, color: 'var(--text)', letterSpacing: '0.01em' }}>
        Quota & Time
      </div>

      {/* Hour blocks — show REMAINING as the main number */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[1, 2].map(b => {
          const used = blockSecs[b - 1];
          const remaining = 55 * 60 - used;
          const over = remaining < 0;
          const tight = !over && remaining < 5 * 60;
          const mainColor = over ? 'var(--red)' : tight ? 'var(--yellow)' : 'var(--green)';
          return (
            <div key={b} style={{
              background: 'var(--surface2)',
              border: `1px solid ${over ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 7,
              padding: '12px 14px',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Hour {b}
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontFamily: 'Fraunces, serif',
                fontWeight: 400,
                color: mainColor,
                lineHeight: 1,
                letterSpacing: '-0.01em',
              }}>
                {over ? `+${formatDuration(Math.abs(remaining))}` : formatDuration(remaining)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 5 }}>
                {over ? 'over limit' : 'remaining'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                {formatDuration(used)} / 55:00 used
              </div>
            </div>
          );
        })}
      </div>

      <Bar label="Danish music" pct={danishPct} target={30} secs={danishSecs} color="var(--green)" />
      <Bar label="P6 Beat" pct={p6Pct} target={30} secs={p6Secs} color="var(--blue)" />

      <div style={{ marginTop: 14, fontSize: '0.75rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        Songs: {formatDuration(totalSongSecs)} · Total show: {formatDuration(totalSecs)}
      </div>
    </div>
  );
}
