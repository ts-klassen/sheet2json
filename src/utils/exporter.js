import { store } from '../store.js';

function mappingToObject(mapping, workbook, schema) {
  const result = {};

  Object.entries(mapping).forEach(([field, addresses]) => {
    const prop = (schema.properties || schema.items?.properties || {})[field] || {};
    const isArray = prop.type === 'array';

    const values = addresses.map(({ sheet, row, col }) => {
      const val = workbook.data[sheet]?.[row]?.[col];
      return val === undefined ? null : val;
    });

    result[field] = isArray ? values : values[0];
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

  // Helper to get cell value
  // If schema root is array, use records array + current mapping as last record
  if (schema.type === 'array') {
    const snapshots = [...store.getState().records];
    if (Object.keys(mapping).length) snapshots.push(mapping);
    return snapshots.map((snap) => mappingToObject(snap, workbook, schema.items || schema));
  }

  // Object root – just convert current mapping
  return mappingToObject(mapping, workbook, schema);
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
