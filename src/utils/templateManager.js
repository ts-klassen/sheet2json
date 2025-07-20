import { store } from '../store.js';

/**
 * Serialize current mapping into a template JSON string and trigger file download
 * with the provided filename.
 * @param {string} [fileName='mapping-template.json']
 */
export function saveTemplate(fileName = 'mapping-template.json') {
  const { mapping, workbook } = store.getState();
  if (!mapping || Object.keys(mapping).length === 0) throw new Error('No mapping to save');

  const template = {
    sheetName: workbook?.activeSheet || null,
    fields: mapping
  };

  const json = JSON.stringify(template, null, 2);

  // Download in browser context; in tests this branch is skipped
  if (typeof document !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL) {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return json;
}

/**
 * Load template from text string or File/Blob. Returns Promise resolved when mapping applied.
 * Performs validation against current workbook cells. Missing addresses are collected
 * and returned as an array.
 * @param {string|File|Blob} source
 * @returns {Promise<{missing: Array<{field:string, address}>}>}
 */
export async function loadTemplate(source) {
  let text;
  if (typeof source === 'string') {
    text = source;
  } else if (source instanceof Blob) {
    text = await source.text();
  } else {
    throw new TypeError('Template source must be string or File/Blob');
  }

  let obj;
  try {
    obj = JSON.parse(text);
  } catch (err) {
    throw new Error('Invalid template JSON');
  }

  if (!obj || typeof obj !== 'object' || !obj.fields) {
    throw new Error('Template missing "fields"');
  }

  const { workbook } = store.getState();
  if (!workbook) throw new Error('No workbook loaded');

  const missing = [];
  const validatedMapping = {};
  Object.entries(obj.fields).forEach(([field, addresses]) => {
    validatedMapping[field] = [];
    addresses.forEach((addr) => {
      if (addr.sheet !== workbook.activeSheet) {
        missing.push({ field, addr });
        return;
      }
      const rows = workbook.data[addr.sheet]?.length || 0;
      const cols = workbook.data[addr.sheet]?.[0]?.length || 0;
      if (addr.row >= rows || addr.col >= cols) {
        missing.push({ field, addr });
      } else {
        validatedMapping[field].push(addr);
      }
    });
    if (validatedMapping[field].length === 0) delete validatedMapping[field];
  });

  store.set('mapping', validatedMapping);

  if (missing.length) {
    const warnings = missing.map((m) => `Missing cell for field ${m.field}`);
    store.set('errors', warnings);
  }

  return { missing };
}
