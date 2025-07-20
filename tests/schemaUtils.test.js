import { parseSchema, validateSchemaObject, getSchemaFields } from '../src/utils/schemaUtils.js';

describe('Schema utils', () => {
  const validSchemaText = JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    }
  });

  test('parseSchema throws on invalid JSON', () => {
    expect(() => parseSchema('{ invalid json')).toThrow('Invalid JSON syntax');
  });

  test('validateSchemaObject throws when properties missing', () => {
    const schema = { type: 'object' };
    expect(() => validateSchemaObject(schema)).toThrow('Schema missing');
  });

  test('getSchemaFields returns field list', () => {
    const { fields } = getSchemaFields(validSchemaText);
    expect(fields).toEqual(['name', 'age']);
  });
});
