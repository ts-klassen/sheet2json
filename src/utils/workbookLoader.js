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
    data[sheetName] = utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
    merges[sheetName] = (sheet['!merges'] || []).map((rng) => ({
      s: { r: rng.s.r, c: rng.s.c },
      e: { r: rng.e.r, c: rng.e.c }
    }));
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
