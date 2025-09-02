// Utilities for generating user-facing labels from schema metadata.

/**
 * Return a label suitable for UI from a JSON Schema property meta.
 * Preference order:
 *   1) Left side of the first colon in description (if present)
 *   2) Title
 *   3) Fallback string
 * @param {object} meta Schema property metadata (may include description/title)
 * @param {string} fallback Fallback label when no description/title
 * @returns {string}
 */
export function labelFromMeta(meta, fallback) {
  const m = meta || {};
  const desc = typeof m.description === 'string' ? m.description : null;
  const fromDesc = desc ? desc.split(':')[0] : null;
  return fromDesc || m.title || fallback;
}

/**
 * Truncate a description at the first colon, returning the left side.
 * If no colon present, returns the original string.
 * @param {string} desc
 * @returns {string}
 */
export function truncateDescription(desc) {
  if (typeof desc !== 'string') return '';
  const idx = desc.indexOf(':');
  return idx >= 0 ? desc.slice(0, idx) : desc;
}

