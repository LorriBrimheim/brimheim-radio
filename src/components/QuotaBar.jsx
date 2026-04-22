import React from 'react';
import { formatDuration } from '../utils';

const Bar = ({ label, pct, target, secs, color }) => {
  const met = pct >= target;
  const width = Math.min(pct, 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.78rem' }}>
        <span style={{ color: 'var(--text-dim)' }}>{label}</span>
        <span style={{ color: met ? 'var(--green)' : 'var(--yellow)', fontWeight: 500 }}>
          {pct.toFixed(1)}% <span style={{ color: 'var(--text-muted)' }}>/ {target}% min</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{formatDuration(secs)}</span>
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${width}%`,
          background: met ? color : 'var(--yellow)',
          borderRadius: 3,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
};

export default function QuotaBar({ quotas, totalSecs, blockSecs }) {
  const { danishPct, p6Pct, danishSecs, p6Secs, totalSongSecs } = quotas;
  const b1Used = blockSecs[0];
  const b2Used = blockSecs[1];
  const b1Remaining = 55 * 60 - b1Used;
  const b2Remaining = 55 * 60 - b2Used;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: 20,
    }}>
      <div style={{ marginBottom: 16, fontFamily: 'Fraunces, serif', fontSize: '1.05rem', fontWeight: 300, color: 'var(--accent)' }}>
        Quota & Time
      </div>

      <Bar label="Danish music" pct={danishPct} target={30} secs={danishSecs} color="var(--green)" />
      <Bar label="P6 Beat" pct={p6Pct} target={30} secs={p6Secs} color="var(--blue)" />

      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[1, 2].map(b => {
          const used = blockSecs[b - 1];
          const remaining = 55 * 60 - used;
          const over = remaining < 0;
          return (
            <div key={b} style={{
              background: 'var(--surface2)',
              border: `1px solid ${over ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 6,
              padding: 12,
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 6 }}>Hour {b}</div>
              <div style={{ fontSize: '1.1rem', fontFamily: 'Fraunces, serif', color: over ? 'var(--red)' : 'var(--text)' }}>
                {formatDuration(used)}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 4 }}>/ 55:00</span>
              </div>
              <div style={{ fontSize: '0.78rem', marginTop: 4, color: over ? 'var(--red)' : 'var(--green)' }}>
                {over ? `${formatDuration(Math.abs(remaining))} over` : `${formatDuration(remaining)} left`}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        Total song time: {formatDuration(totalSongSecs)} · Total show time: {formatDuration(totalSecs)}
      </div>
    </div>
  );
}
