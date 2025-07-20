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
  if (!schema.properties || typeof schema.properties !== 'object') {
    throw new Error('Schema missing "properties"');
  }
  return Object.keys(schema.properties);
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
