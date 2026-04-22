// Time utilities
export const parseDuration = (str) => {
  if (!str) return 0;
  str = str.trim();
  // mm:ss
  const mmss = str.match(/^(\d+):(\d{2})$/);
  if (mmss) return parseInt(mmss[1]) * 60 + parseInt(mmss[2]);
  // plain seconds
  const secs = str.match(/^\d+$/);
  if (secs) return parseInt(str);
  return 0;
};

export const formatDuration = (secs) => {
  if (!secs && secs !== 0) return '0:00';
  const m = Math.floor(Math.abs(secs) / 60);
  const s = Math.abs(secs) % 60;
  const sign = secs < 0 ? '-' : '';
  return `${sign}${m}:${s.toString().padStart(2, '0')}`;
};

export const formatTimestamp = (secs) => {
  const totalMins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${totalMins}:${s.toString().padStart(2, '0')}`;
};

// Show constants
export const HOUR1_END = 55 * 60;   // 55:00 — news break
export const HOUR2_END = 110 * 60;  // 110:00 — end of show (55 mins programming in hour 2)
export const NEWS_DURATION = 5 * 60;
export const MAX_SPEAK = 3.5 * 60;
export const MAX_SPEAK_SOLO = 2 * 60;

// Item types
export const ITEM_TYPES = {
  SONG: 'song',
  SPEAK: 'speak',
};

// Quota helpers
export const calcQuotas = (items) => {
  const songs = items.filter(i => i.type === ITEM_TYPES.SONG);
  const totalSongSecs = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const danishSecs = songs.filter(s => s.isDanish).reduce((acc, s) => acc + (s.duration || 0), 0);
  const p6Secs = songs.filter(s => s.isP6Beat).reduce((acc, s) => acc + (s.duration || 0), 0);

  return {
    totalSongSecs,
    danishPct: totalSongSecs > 0 ? (danishSecs / totalSongSecs) * 100 : 0,
    p6Pct: totalSongSecs > 0 ? (p6Secs / totalSongSecs) * 100 : 0,
    danishSecs,
    p6Secs,
  };
};

export const calcTotalTime = (items) =>
  items.reduce((acc, i) => acc + (i.duration || 0), 0);

export const generateId = () => Math.random().toString(36).slice(2, 9);

// Assign running timestamps to items, split across two 55-min blocks
export const assignTimestamps = (items) => {
  let cursor = 0;
  return items.map((item) => {
    const start = cursor;
    cursor += item.duration || 0;
    return { ...item, startTime: start };
  });
};

// Which block does a cumulative time fall in?
export const getBlock = (startSecs) => {
  if (startSecs < HOUR1_END) return 1;
  return 2;
};
