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

  const sheetData = workbook.data[workbook.activeSheet] || [];
  const maxRows = sheetData.length;

  const newMapping = {};
  Object.entries(mapping).forEach(([field, addresses]) => {
    const shifted = addresses
      .map((addr, index) => {
        // Support custom script or numeric step.
        let newRow = addr.row;
        let newCol = addr.col;

        if (typeof addr.script === 'string' && addr.script.trim()) {
          try {
            // eslint-disable-next-line no-new-func
            const fn = new Function(
              'row',
              'col',
              'sheet',
              'field',
              'index',
              'mapping',
              addr.script
            );
            const res = fn(addr.row, addr.col, addr.sheet, field, index, mapping);

            if (typeof res === 'number' && Number.isFinite(res)) {
              newRow += res;
            } else if (res && typeof res === 'object') {
              if (Number.isFinite(res.row)) newRow = res.row;
              if (Number.isFinite(res.col)) newCol = res.col;
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Custom script error:', err);
            // fall back to step or no move
          }
        } else {
          const dy = Number.isFinite(addr.dy) ? addr.dy : Number.isFinite(addr.step) ? addr.step : 1;
          const dx = Number.isFinite(addr.dx) ? addr.dx : 0;
          newRow += dy;
          newCol += dx;
        }

        return { ...addr, row: newRow, col: newCol };
      })
      .filter((addr) => {
        if (addr.row < 0 || addr.row >= maxRows) return false;
        const rowArr = sheetData[addr.row] || [];
        if (addr.col < 0 || addr.col >= rowArr.length) return false;
        return true;
      });
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

  if (!schema || typeof schema !== 'object') {
    throw new Error('Schema is not loaded');
  }

  // Support both object‐root schemas (schema.properties) and array‐root
  // schemas (schema.type === 'array' with schema.items.properties).
  /* eslint-disable prefer-destructuring */
  const props =
    schema.properties ||
    (schema.type === 'array' && schema.items && schema.items.properties);
  /* eslint-enable prefer-destructuring */

  if (!props || typeof props !== 'object') {
    throw new Error('Schema is not loaded');
  }

  const fieldNames = Object.keys(props);
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
