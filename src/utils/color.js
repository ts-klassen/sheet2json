/**
 * Deterministically generate an HSL colour for a given field name. Keeping
 * identical algorithm between SchemaInput and highlight overlay for visual
 * consistency.
 * @param {string} name
 * @returns {string} CSS HSL colour string
 */
export function colourForField(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 70%)`;
}
