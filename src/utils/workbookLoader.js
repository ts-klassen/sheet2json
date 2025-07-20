/*
 * WorkbookLoader utility wrappers around SheetJS (xlsx) that read raw ArrayBuffer or File
 * objects and return a normalised workbook structure as defined in the design document.
 */

import { read, utils } from 'xlsx';

/**
 * Parse an ArrayBuffer (or Uint8Array) containing workbook data.
 * @param {ArrayBuffer|Uint8Array} buffer
 * @param {string} [fileName] Optional filename for extension heuristics.
 * @returns {WorkbookState}
 */
export function parseArrayBuffer(buffer, fileName = '') {
  if (!buffer) throw new Error('No buffer supplied');

  // Convert to Uint8Array if needed because xlsx expects that for type "array".
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // Read workbook using SheetJS.
  const wb = read(uint8, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });

  // Use first sheet as active by default.
  const sheets = wb.SheetNames;
  const activeSheet = sheets[0];

  // Convert sheets to 2D arrays of cell values.
  const data = {};
  sheets.forEach((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    data[sheetName] = utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  });

  return {
    sheets,
    activeSheet,
    data
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
