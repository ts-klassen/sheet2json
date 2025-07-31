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

  Object.entries(mapping).forEach(([field, addresses]) => {
    // Determine whether the schema defines the field as an array so we can
    // preserve cardinality in the output. We locate the property via helper
    // to support schemas that wrap definitions under "cells".
    const prop = getSchemaProperties(schema)?.[field] || {};
    const isArray = prop.type === 'array';

    // Transform every mapped address into the desired structure { cell, value }.
    const transformed = addresses.map(({ sheet, row, col }) => {
      const val = workbook.data[sheet]?.[row]?.[col];
      const value = val === undefined ? null : val;
      return {
        cell: toA1(col, row),
        value
      };
    });

    // Scalar fields take the *first* mapped address (if any), whereas array
    // fields include all mappings in the same order they were added.
    result[field] = isArray ? transformed : transformed[0] || null;
  });

  return result;
}

/**
 * Transform the current mapping and workbook into output JSON.
 * Handles scalar vs array fields based on schema property type.
 */
export function buildJson() {
  const { mapping, workbook, schema } = store.getState();
  if (!mapping || !schema || !workbook) {
    throw new Error('Missing mapping, schema, or workbook');
  }

  const wrap = (obj) => ({ cells: obj });

  // Array schema root – return array of wrapped cell objects.
  if (schema.type === 'array') {
    const snapshots = [...store.getState().records];
    if (Object.keys(mapping).length) snapshots.push(mapping);
    return snapshots.map((snap) => wrap(mappingToObject(snap, workbook, schema.items || schema)));
  }

  // Object root – wrap single object
  return wrap(mappingToObject(mapping, workbook, schema));
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
