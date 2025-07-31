// Utility functions for JSON Schema parsing and validation.

/**
 * Parse raw JSON text and return object.
 * Throws Error with message suitable for user.
 *
 * @param {string} text Raw JSON string from textarea or file.
 * @returns {object} Parsed schema object.
 */
export function parseSchema(text) {
  if (typeof text !== 'string') throw new TypeError('Schema input must be a string');
  let obj;
  try {
    obj = JSON.parse(text);
  } catch (err) {
    throw new Error('Invalid JSON syntax');
  }
  return obj;
}

/**
 * Validate that schema contains a top-level "properties" object (per requirements).
 * Returns array of field names if valid.
 * Throws Error if invalid.
 *
 * @param {object} schema Parsed schema object.
 * @returns {string[]} List of field names.
 */
export function validateSchemaObject(schema) {
  if (!schema || typeof schema !== 'object') throw new Error('Schema must be an object');

  const props = getSchemaProperties(schema);
  if (props) {
    return Object.keys(props);
  }

  throw new Error('Schema missing "properties"');
}

/**
 * Given raw JSON string, validate and return field names.
 * Convenient wrapper for callers.
 */
export function getSchemaFields(jsonText) {
  const obj = parseSchema(jsonText);
  const fields = validateSchemaObject(obj);
  return { schema: obj, fields };
}

/**
 * Return the relevant properties object for the provided schema, unwrapping
 * the common `{ cells: { properties: ... } }` wrapper when present.  Handles
 * both object and array roots (inspecting `items` recursively).
 *
 * @param {object} schema JSON schema object.
 * @returns {object|null} The properties object or null if not found.
 */
export function getSchemaProperties(schema) {
  if (!schema || typeof schema !== 'object') return null;

  // Helper to unwrap a single schema level.
  const unwrap = (sch) => {
    if (!sch || typeof sch !== 'object') return null;
    if (sch.properties && typeof sch.properties === 'object') {
      // If there is a single "cells" property with its own properties, prefer those.
      if (sch.properties.cells) {
        const cells = sch.properties.cells;
        // cells as object
        if (cells.properties) return cells.properties;
        // cells as array
        if (cells.items && cells.items.properties) return cells.items.properties;
      }
      return sch.properties;
    }
    return null;
  };

  // Direct object root.
  const direct = unwrap(schema);
  if (direct) return direct;

  // Array root – inspect items schema (one level deep is sufficient for our purposes).
  if (schema.type === 'array' && schema.items) {
    return unwrap(schema.items);
  }

  return null;
}
