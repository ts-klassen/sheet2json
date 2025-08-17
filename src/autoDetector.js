// AutoDetector subscribes to store. When workbook and schema are present and
// mapping is empty, it applies a basic positional rule set to pre-fill obvious
// mappings (Req 4.1 – 4.3).

import { store } from './store.js';

// Simple fixed rule set: fieldName (lowercase) -> A1 etc.
// Extend as needed.
const RULES = {
  title: 'A1',
  description: 'B1'
};

function letterToColIndex(letter) {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 64);
  }
  return col - 1; // zero-based
}

function parseCellAddress(addr) {
  const match = /^([A-Z]+)(\d+)$/i.exec(addr);
  if (!match) return null;
  const colLetters = match[1].toUpperCase();
  const rowNumber = parseInt(match[2], 10);
  return { row: rowNumber - 1, col: letterToColIndex(colLetters) };
}

function buildMapping(fields, activeSheet) {
  const mapping = {};
  fields.forEach((field) => {
    const cellAddr = RULES[field.toLowerCase()];
    if (cellAddr) {
      const { row, col } = parseCellAddress(cellAddr);
      mapping[field] = [{ sheet: activeSheet, row, col, dy: 1, dx: 0, jumpNext: true }];
    }
  });
  return mapping;
}

function tryAutoDetect() {
  const { workbook, schema, mapping } = store.getState();
  if (!workbook || !schema) return;
  if (mapping && Object.keys(mapping).length > 0) return; // don't overwrite user mapping

  if (!schema.properties) return;
  const fields = Object.keys(schema.properties);
  const proposed = buildMapping(fields, workbook.activeSheet);
  if (Object.keys(proposed).length > 0) {
    store.set('mapping', proposed);
  }
}

// Subscribe once.
store.subscribe(tryAutoDetect);

// Export for tests.
export { parseCellAddress, buildMapping, tryAutoDetect };
