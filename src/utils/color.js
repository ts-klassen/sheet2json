/**
 * Deterministically pick a distinct, colorblind-safe colour for a given field
 * name. We prefer a curated qualitative palette for maximum separability and
 * fall back to a golden-angle HSL generator when more distinct colours are
 * needed than the palette provides. The mapping is stable across runs.
 *
 * Palette source: Paul Tol 12 (colourblind-safe)
 *   https://personal.sron.nl/~pault/ (common knowledge palette)
 *
 * @param {string} name
 * @returns {string} CSS color string (hex or hsl)
 */
// Modern, balanced palette (Tailwind-inspired, -600 tones)
// Order maximizes separation between adjacent indices
// 6 binary RGB colours excluding black (#000) and white (#fff) + orange + gray
// Order mirrors user's example: 00f, 0f0, 0ff, f00, f0f, ff0, orange, gray
const PALETTE = ['#0000ff', '#00ff00', '#00ffff', '#ff0000', '#ff00ff', '#ffff00', '#ffa500', '#808080'];

// Optional ordered mapping: set by MappingPanel to guarantee unique colours
// for the first N fields (N = PALETTE.length). Falls back to hashing when
// called before registration or for unknown fields.
const fieldOrder = new Map();

export function registerFieldOrder(fields = []) {
  fieldOrder.clear();
  fields.forEach((name, i) => {
    fieldOrder.set(String(name), i);
  });
}

export function colourForField(name = '') {
  if (fieldOrder.has(name)) {
    const i = fieldOrder.get(name) % PALETTE.length;
    return PALETTE[i];
  }
  // Stable 32-bit hash for string → integer
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (name.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  }
  const idx = Math.abs(hash);
  return PALETTE[idx % PALETTE.length];
}

// Derived variants that KEEP the base colour mapping but provide friendlier UI
const _hexToRgb = (hex) => {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
};

export function colourFillForField(name = '', alpha = 0.15) {
  const base = colourForField(name);
  const { r, g, b } = _hexToRgb(base);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function colourBorderForField(name = '') {
  // Keep the exact base colour for borders to honour the mapping
  return colourForField(name);
}

export function colourOutlineForField(name = '', alpha = 0.6) {
  const base = colourForField(name);
  const { r, g, b } = _hexToRgb(base);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
