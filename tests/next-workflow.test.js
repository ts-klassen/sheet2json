// Unit tests for Requirement 2 – verifies that the "Next" button workflow
// correctly validates the current field mapping, stores a deep-clone snapshot
// inside `store.records`, and advances the `currentFieldIndex` pointer.

import { store } from '../src/store.js';
import { advanceCurrentField } from '../src/utils/mappingUtils.js';

describe('Next workflow – advanceCurrentField', () => {
  const schema = {
    properties: {
      title: { type: 'string' },
      name: { type: 'string' }
    }
  };

  beforeEach(() => {
    // Reset relevant store slices to a known baseline for each test case.
    store.set('schema', schema);
    store.set('currentFieldIndex', 0);

    // Seed mapping with an entry for the first field ("title") so validation
    // in `advanceCurrentField` succeeds.
    store.set('mapping', {
      title: [{ sheet: 'Sheet1', row: 0, col: 0 }]
    });

    // Ensure records starts empty so we can assert it has grown by one.
    store.set('records', []);
  });

  afterEach(() => {
    // Clean up all modified store slices so other tests are isolated.
    store.set('schema', null);
    store.set('mapping', {});
    store.set('records', []);
    store.set('currentFieldIndex', 0);
  });

  test('returns false if current field has no mapping', () => {
    // Remove mapping so validation fails.
    store.set('mapping', {});

    const result = advanceCurrentField();
    expect(result).toBe(false);

    // State should remain unchanged.
    const { currentFieldIndex, records } = store.getState();
    expect(currentFieldIndex).toBe(0);
    expect(records.length).toBe(0);
  });

  test('pushes snapshot and increments index when valid', () => {
    const success = advanceCurrentField();
    expect(success).toBe(true);

    const { records, currentFieldIndex, mapping } = store.getState();

    // Snapshot should contain a deep clone equal (not same reference) to mapping.
    expect(records.length).toBe(1);
    expect(records[0]).toEqual(mapping);
    expect(records[0]).not.toBe(mapping);

    // Index advances from 0 -> 1 (but not beyond last field).
    expect(currentFieldIndex).toBe(1);
  });
});
