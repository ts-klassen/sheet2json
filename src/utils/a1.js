// Utilities to convert between A1-style addresses and 0-based indices

export function colToLetters(idx) {
  let c = Number(idx);
  if (!Number.isFinite(c) || c < 0) return '';
  let letters = '';
  while (c >= 0) {
    letters = String.fromCharCode((c % 26) + 65) + letters;
    c = Math.floor(c / 26) - 1;
  }
  return letters;
}

export function lettersToCol(letters) {
  const s = String(letters || '').trim().toUpperCase();
  if (!/^[A-Z]+$/.test(s)) return NaN;
  let col = 0;
  for (let i = 0; i < s.length; i++) {
    col = col * 26 + (s.charCodeAt(i) - 64);
  }
  return col - 1; // zero-based
}

export function parseA1Cell(a1) {
  const m = /^\s*([A-Za-z]+)(\d+)\s*$/.exec(String(a1 || ''));
  if (!m) return null;
  const col = lettersToCol(m[1]);
  const row = parseInt(m[2], 10) - 1;
  if (!Number.isFinite(col) || !Number.isFinite(row) || row < 0 || col < 0) return null;
  return { row, col };
}

export function formatA1Cell({ row, col }) {
  return `${colToLetters(col)}${row + 1}`;
}

export function parseA1Range(rangeStr) {
  if (!rangeStr) return null;
  const parts = String(rangeStr).split(':');
  const start = parseA1Cell(parts[0]);
  const end = parts[1] ? parseA1Cell(parts[1]) : start;
  if (!start || !end) return null;
  const r0 = Math.min(start.row, end.row);
  const c0 = Math.min(start.col, end.col);
  const r1 = Math.max(start.row, end.row);
  const c1 = Math.max(start.col, end.col);
  return { start: { row: r0, col: c0 }, end: { row: r1, col: c1 } };
}

export function formatA1Range({ start, end }) {
  return `${formatA1Cell(start)}:${formatA1Cell(end)}`;
}

