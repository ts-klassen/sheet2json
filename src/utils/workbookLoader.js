/*
 * WorkbookLoader utility wrappers around SheetJS (xlsx) that read raw ArrayBuffer or File
 * objects and return a normalised workbook structure as defined in the design document.
 */

import { read, utils } from 'xlsx';

const SUPPORTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

function getExtension(name = '') {
  const match = /\.[^.]+$/.exec(name);
  return match ? match[0].toLowerCase() : '';
}

/**
 * Parse an ArrayBuffer (or Uint8Array) containing workbook data.
 * @param {ArrayBuffer|Uint8Array} buffer
 * @param {string} [fileName] Optional filename for extension heuristics.
 * @returns {WorkbookState}
 */
export function parseArrayBuffer(buffer, fileName = '') {
  if (!buffer) throw new Error('No buffer supplied');

  // Validate extension when provided to catch obviously unsupported types early.
  const ext = getExtension(fileName);
  if (ext && !SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  // Convert to Uint8Array if needed because xlsx expects that for type "array".
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // Basic signature validation to catch obvious corrupt files before SheetJS fallback.
  if (ext === '.xlsx' && !(uint8[0] === 0x50 && uint8[1] === 0x4b)) {
    throw new Error('Unsupported or corrupt file');
  }
  if (ext === '.xls' && !(uint8[0] === 0xd0 && uint8[1] === 0xcf)) {
    throw new Error('Unsupported or corrupt file');
  }

  // Read workbook using SheetJS.
  let wb;
  try {
    wb = read(uint8, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
  } catch (err) {
    throw new Error('Unsupported or corrupt file');
  }

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('Unsupported or corrupt file');
  }

  // Use first sheet as active by default.
  const sheets = wb.SheetNames;
  const activeSheet = sheets[0];

  // Convert sheets to 2D arrays of cell values and gather merge ranges.
  const data = {};
  const merges = {};

  sheets.forEach((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    // Use empty string for empty/missing cells so downstream export never emits null for values.
    data[sheetName] = utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
    merges[sheetName] = (sheet['!merges'] || []).map((rng) => ({
      s: { r: rng.s.r, c: rng.s.c },
      e: { r: rng.e.r, c: rng.e.c }
    }));
  });

  // Unmerge behaviour: for each merge range, copy the top-left value into all
  // cells covered by the range. This makes the grid rectangular and ensures
  // exports use the visible value even when a user maps a "shadow" cell that
  // was originally part of a merged block.
  sheets.forEach((sheetName) => {
    const ranges = merges[sheetName] || [];
    if (!ranges.length) return;
    const grid = data[sheetName] || [];

    ranges.forEach((rng) => {
      const r0 = rng.s.r;
      const c0 = rng.s.c;
      const r1 = rng.e.r;
      const c1 = rng.e.c;

      // Ensure rows exist up to r1
      for (let r = 0; r <= r1; r++) {
        if (!Array.isArray(grid[r])) grid[r] = [];
      }

      // Ensure each affected row has columns up to c1
      for (let r = r0; r <= r1; r++) {
        const rowArr = grid[r];
        if (rowArr.length <= c1) {
          // fill with empty strings to avoid undefined
          for (let c = rowArr.length; c <= c1; c++) rowArr[c] = '';
        }
      }

      const topLeftVal = (grid[r0] && grid[r0][c0]) != null ? grid[r0][c0] : '';
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          grid[r][c] = topLeftVal;
        }
      }
    });
  });

  return {
    sheets,
    activeSheet,
    data,
    merges
  };
}

/**
 * Load and parse a File (from <input type="file">). Returns Promise resolving to WorkbookState.
 * @param {File} file
 */
export function loadWorkbookFile(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      reject(new TypeError('Expected File object'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('File read error'));
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const workbook = parseArrayBuffer(buffer, file.name);
        resolve(workbook);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
