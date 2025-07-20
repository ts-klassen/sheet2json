import { store } from '../src/store.js';
import { shiftMappingDown } from '../src/utils/mappingUtils.js';

describe('Next Row mapping shift', () => {
  beforeEach(() => {
    store.set('workbook', {
      sheets: ['S'],
      activeSheet: 'S',
      data: { S: Array.from({ length: 5 }, () => Array(2).fill('')) },
      merges: {}
    });
    store.set('mapping', {
      fieldA: [{ sheet: 'S', row: 1, col: 0 }],
      fieldB: [{ sheet: 'S', row: 1, col: 1 }]
    });
  });

  afterEach(() => {
    store.set('mapping', {});
    store.set('workbook', null);
    store.set('records', []);
  });

  test('rows shift down by 1', () => {
    shiftMappingDown();
    const state = store.getState();
    const mapping = state.mapping;
    expect(mapping.fieldA[0].row).toBe(2);
    expect(state.records.length).toBe(1); // snapshot stored
  });

  test('cells beyond sheet rows are removed', () => {
    // Shift 4 times should empty mapping
    for (let i = 0; i < 4; i++) shiftMappingDown();
    expect(Object.keys(store.getState().mapping).length).toBe(0);
  });
});
