import { store } from '../store.js';
import { getSchemaProperties } from './schemaUtils.js';

// ---------------------------------------------------------------------------
// Helper – convert zero-based column & row indexes to an A1-style reference.
// Examples: (0,0) -> "A1"; (1,9) -> "B10"; (54,122) -> "BB123".
// ---------------------------------------------------------------------------
function toA1(col, row) {
  // Convert column number to letters – algorithm borrowed from common
  // spreadsheet helpers. Works for arbitrary column index >= 0.
  let c = col;
  let letters = '';
  while (c >= 0) {
    letters = String.fromCharCode((c % 26) + 65) + letters; // 65 = "A"
    c = Math.floor(c / 26) - 1;
  }
  // Row index is zero-based inside the workbook – convert to 1-based for A1.
  return `${letters}${row + 1}`;
}

function mappingToObject(mapping, workbook, schema) {
  const result = {};

  // Iterate across all schema properties to ensure array fields appear as
  // empty arrays even when no mapping exists.
  const props = getSchemaProperties(schema) || {};
  const requiredList = Array.isArray(schema?.required) ? schema.required : [];
  Object.keys(props).forEach((field) => {
    const prop = props[field] || {};
    const isArray = prop.type === 'array';
    const addresses = Array.isArray(mapping?.[field]) ? mapping[field] : [];

    const transformed = addresses.map(({ sheet, row, col }) => {
      const val = workbook.data[sheet]?.[row]?.[col];
      // Always export values as strings; use empty string for empty cells.
      const value = val == null ? '' : String(val);
      return {
        cell: toA1(col, row),
        value
      };
    });

    if (isArray) {
      // Include arrays only when mapped or required; otherwise omit.
      if (transformed.length > 0 || requiredList.includes(field)) {
        result[field] = transformed;
      }
    } else {
      // For scalars, omit the field entirely when unmapped.
      if (transformed.length > 0) {
        result[field] = transformed[0];
      }
    }
  });

  return result;
}

// Determine the schema that defines the properties we map (handles wrappers).
function _effectiveItemSchema(schema) {
  if (!schema || typeof schema !== 'object') return {};
  const cellsDef = schema.properties?.cells;
  if (cellsDef && cellsDef.type === 'array') {
    return cellsDef.items || cellsDef;
  }
  if (schema.type === 'array' && schema.items) {
    return schema.items;
  }
  return schema;
}

/**
 * Compute a flat list of required fields that are currently unmapped
 * in the provided mapping object, according to the effective item schema.
 */
export function findMissingRequiredFields(schema, mapping) {
  const eff = _effectiveItemSchema(schema);
  const props = getSchemaProperties(eff) || {};
  const requiredList = Array.isArray(eff?.required) ? eff.required : [];
  const missing = [];

  requiredList.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(props, field)) return;
    const prop = props[field] || {};
    const list = Array.isArray(mapping?.[field]) ? mapping[field] : [];
    // Array fields are allowed to be unmapped and will export as []
    // (see mappingToObject). Do not warn for these.
    const isArray = prop.type === 'array';
    if (!list.length && !isArray) {
      missing.push(field);
    }
  });

  return missing;
}

/**
 * Transform the current mapping and workbook into output JSON.
 * Handles scalar vs array fields based on schema property type.
 */
export function buildJson() {
  const { mapping, workbook, schema, records } = store.getState();
  if (!schema || !workbook) {
    throw new Error('Missing mapping, schema, or workbook');
  }

  // Detect "cells" array wrapper (object root with cells: array)
  const cellsDef = schema.properties?.cells;

  // -----------------------------------------------------------
  // Case A – root object with `cells` array
  // -----------------------------------------------------------
  if (cellsDef && cellsDef.type === 'array') {
    const snapshots = Array.isArray(records) ? records : [];
    const cellObjects = snapshots.map((snap) =>
      mappingToObject(snap, workbook, cellsDef.items || cellsDef)
    );

    return { cells: cellObjects };
  }

  // -----------------------------------------------------------
  // Case B – schema root is *itself* an array of objects
  // -----------------------------------------------------------
  if (schema.type === 'array') {
    const snapshots = Array.isArray(records) ? records : [];
    return snapshots.map((snap) => ({
      cells: mappingToObject(snap, workbook, schema.items || schema)
    }));
  }

  // -----------------------------------------------------------
  // Case C – simple object root (legacy behaviour)
  // -----------------------------------------------------------
  // For simple object root, export only the latest confirmed snapshot.
  const snapshots = Array.isArray(records) ? records : [];
  if (snapshots.length === 0) {
    throw new Error('No confirmed records to export');
  }
  const last = snapshots[snapshots.length - 1];
  return { cells: mappingToObject(last, workbook, schema) };
}

// Expose helper on `window` for end-to-end tests so Cypress can easily obtain
// the generated JSON without traversing the DOM.  The attachment is performed
// only in browser contexts.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'buildJson', {
    value: buildJson,
    writable: false,
    configurable: false
  });
}

/**
 * POST JSON to provided URL using fetch. Returns Promise resolved with response JSON.
 */
export async function postJson(url, jsonObj, fetchImpl = (typeof fetch !== 'undefined' ? fetch : null)) {
  if (typeof url !== 'string' || !url) throw new TypeError('URL required');
  if (!fetchImpl) throw new Error('Fetch API unavailable');

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jsonObj)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST failed: ${res.status} ${text}`);
  }

  return res.json().catch(() => ({}));
}
