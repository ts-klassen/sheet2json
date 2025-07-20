import { store } from '../store.js';

function deepCloneMapping(mapping) {
  const clone = {};
  Object.entries(mapping).forEach(([field, arr]) => {
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
