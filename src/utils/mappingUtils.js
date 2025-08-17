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

  const shadowCache = new Map(); // sheetName -> Set('r:c') of shadow cells
  function getShadowSet(sheetName) {
    if (shadowCache.has(sheetName)) return shadowCache.get(sheetName);
    const set = new Set();
    const ranges = (workbook.merges && workbook.merges[sheetName]) || [];
    ranges.forEach((rng) => {
      for (let r = rng.s.r; r <= rng.e.r; r++) {
        for (let c = rng.s.c; c <= rng.e.c; c++) {
          if (r === rng.s.r && c === rng.s.c) continue;
          set.add(`${r}:${c}`);
        }
      }
    });
    shadowCache.set(sheetName, set);
    return set;
  }

  const newMapping = {};
  const leaderDelta = new Map(); // key `${field}:${index}` -> { dr, dc }
  const followers = []; // { field, index, addr }

  Object.entries(mapping).forEach(([field, addresses]) => {
    const shifted = addresses
      .map((addr, index) => {
        // Support custom script or numeric step.
        const sheetName = addr.sheet || workbook.activeSheet;
        const grid = (workbook.data && workbook.data[sheetName]) || [];
        const maxRows = grid.length;
        let newRow = addr.row;
        let newCol = addr.col;

        if (addr.follow && addr.follow.field) {
          // Defer follow processing to second pass
          followers.push({ field, index, addr });
          return null;
        } else if (typeof addr.script === 'string' && addr.script.trim()) {
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
          if (addr.jumpNext) {
            // Walk along (dy,dx) skipping empty and shadow cells
            const shadow = getShadowSet(sheetName);
            let attempts = 0;
            const maxAttempts = Math.max(1, maxRows * 4);
            let r = newRow;
            let c = newCol;
            while (attempts < maxAttempts) {
              r += dy;
              c += dx;
              attempts += 1;
              if (r < 0 || c < 0) break;
              if (r >= maxRows) break;
              const rowArr = grid[r] || [];
              if (c >= rowArr.length) break;
              const val = rowArr[c];
              const isEmpty = val == null || val === '';
              const isShadow = shadow.has(`${r}:${c}`);
              if (!isEmpty && !isShadow) {
                newRow = r;
                newCol = c;
                break;
              }
            }
          } else {
            newRow += dy;
            newCol += dx;
          }
        }

        const moved = { ...addr, row: newRow, col: newCol };
        leaderDelta.set(`${field}:${index}`, { dr: newRow - addr.row, dc: newCol - addr.col });
        return moved;
      })
      .filter((addr) => addr) // drop deferred followers
      .filter((addr) => {
        const sheetName = addr.sheet || workbook.activeSheet;
        const grid = (workbook.data && workbook.data[sheetName]) || [];
        const maxRows = grid.length;
        if (addr.row < 0 || addr.row >= maxRows) return false;
        const rowArr = grid[addr.row] || [];
        if (addr.col < 0 || addr.col >= rowArr.length) return false;
        return true;
      });
    if (shifted.length) newMapping[field] = shifted;
  });

  // Second pass: process followers
  followers.forEach(({ field, index, addr }) => {
    const key = `${addr.follow.field}:${addr.follow.index}`;
    const delta = leaderDelta.get(key);
    let newRow = addr.row;
    let newCol = addr.col;
    if (delta) {
      newRow += delta.dr;
      newCol += delta.dc;
    }
    const sheetName = addr.sheet || workbook.activeSheet;
    const grid = (workbook.data && workbook.data[sheetName]) || [];
    const maxRows = grid.length;
    if (newRow < 0 || newRow >= maxRows) return;
    const rowArr = grid[newRow] || [];
    if (newCol < 0 || newCol >= rowArr.length) return;
    const moved = { ...addr, row: newRow, col: newCol };
    if (!newMapping[field]) newMapping[field] = [];
    newMapping[field].push(moved);
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
