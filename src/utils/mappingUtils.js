import { store } from '../store.js';

/**
 * Deep clone the mapping object `{ [field]: CellAddress[] }` so mutations on
 * the clone do not affect the original references stored in the global state.
 * @param {Record<string, import('../store.js').CellAddress[]>} mapping
 * @returns {Record<string, import('../store.js').CellAddress[]>}
 */
export function deepCloneMapping(mapping) {
  const clone = {};
  Object.entries(mapping || {}).forEach(([field, arr]) => {
    clone[field] = arr.map((addr) => ({ ...addr }));
  });
  return clone;
}

/**
 * Shift all mapped cell addresses down by 1 row. If a row would exceed the
 * worksheet length, it is ignored (mapping for that cell is removed).
 * Returns the updated mapping object.
 */
export function shiftMappingDown() {
  const { workbook, mapping, records } = store.getState();
  if (!workbook || !mapping) return mapping;

  // Snapshot current mapping before shifting
  if (Object.keys(mapping).length) {
    const snapshot = deepCloneMapping(mapping);
    store.set('records', [...records, snapshot]);
  }

  const maxRows = workbook.data[workbook.activeSheet]?.length || 0;

  const newMapping = {};
  Object.entries(mapping).forEach(([field, addresses]) => {
    const shifted = addresses
      .map((addr) => ({ ...addr, row: addr.row + 1 }))
      .filter((addr) => addr.row < maxRows);
    if (shifted.length) newMapping[field] = shifted;
  });

  store.set('mapping', newMapping);
  return newMapping;
}

/**
 * Validate that the current schema field is mapped. When valid, push a deep
 * clone snapshot of the entire mapping into `store.records` and advance the
 * `currentFieldIndex` by one so the UI focuses the next field in
 * MappingPanel.
 *
 * Returns `true` if the workflow succeeded (snapshot pushed, index advanced),
 * or `false` if validation failed (no mapped cells for the current field).
 */
export function advanceCurrentField() {
  const { schema, mapping, records, currentFieldIndex } = store.getState();

  if (!schema || !schema.properties) {
    throw new Error('Schema is not loaded');
  }

  const fieldNames = Object.keys(schema.properties);
  const currentField = fieldNames[currentFieldIndex];

  if (!currentField) {
    // No field corresponds to the current index – nothing to advance.
    return false;
  }

  const hasMapping =
    mapping &&
    mapping[currentField] &&
    Array.isArray(mapping[currentField]) &&
    mapping[currentField].length > 0;

  if (!hasMapping) {
    return false; // Validation failed – caller may warn the user.
  }

  // Push deep clone snapshot of the entire mapping.
  const snapshot = deepCloneMapping(mapping);
  store.set('records', [...records, snapshot]);

  // Advance focus index but clamp to last field to avoid overflow.
  const nextIndex = Math.min(currentFieldIndex + 1, fieldNames.length - 1);
  store.set('currentFieldIndex', nextIndex);

  return true;
}
