import { store } from '../src/store.js';
import { buildJson, postJson } from '../src/utils/exporter.js';

describe('Exporter', () => {
  beforeEach(() => {
    store.set('workbook', {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: { Sheet1: [['Title', 'Desc']] },
      merges: {}
    });
    store.set('schema', {
      properties: {
        title: { type: 'string' },
        notes: { type: 'array' }
      }
    });
    store.set('mapping', {
      title: [{ sheet: 'Sheet1', row: 0, col: 0 }],
      notes: [
        { sheet: 'Sheet1', row: 0, col: 1 },
        { sheet: 'Sheet1', row: 0, col: 0 }
      ]
    });
  });

  afterEach(() => {
    store.set('workbook', null);
    store.set('schema', null);
    store.set('mapping', {});
    store.set('records', []);
  });

  test('buildJson includes cell & value (scalar vs array)', () => {
    // Only confirmed snapshots should be exported
    const m = JSON.parse(JSON.stringify(store.getState().mapping));
    store.set('records', [m]);
    const json = buildJson();

    // Root should be "cells"
    expect(json).toHaveProperty('cells');

    // Scalar field – single object { cell, value }
    expect(json.cells.title).toEqual({ cell: 'A1', value: 'Title' });

    // Array field – array of objects (order preserved)
    expect(Array.isArray(json.cells.notes)).toBe(true);
    expect(json.cells.notes.length).toBe(2);
    expect(json.cells.notes[0]).toEqual({ cell: 'B1', value: 'Desc' });
    expect(json.cells.notes[1]).toEqual({ cell: 'A1', value: 'Title' });
  });

  test('buildJson coerces numeric cell values to strings', () => {
    // Prepare workbook with a number in a cell
    store.set('workbook', {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: { Sheet1: [[123, 'X']] },
      merges: {}
    });
    store.set('schema', {
      properties: {
        qty: { type: 'string' },
        list: { type: 'array' }
      }
    });
    store.set('mapping', {
      qty: [{ sheet: 'Sheet1', row: 0, col: 0 }],
      list: [
        { sheet: 'Sheet1', row: 0, col: 0 },
        { sheet: 'Sheet1', row: 0, col: 1 }
      ]
    });

    const m = JSON.parse(JSON.stringify(store.getState().mapping));
    store.set('records', [m]);
    const json = buildJson();

    expect(json.cells.qty).toEqual({ cell: 'A1', value: '123' });
    expect(json.cells.list[0]).toEqual({ cell: 'A1', value: '123' });
    expect(json.cells.list[1]).toEqual({ cell: 'B1', value: 'X' });
  });

  test('buildJson returns array of objects based on records', () => {
    // switch to array schema
    store.set('schema', {
      type: 'array',
      items: { type: 'object', properties: { title: { type: 'string' }, notes: { type: 'array' } } }
    });

    // simulate snapshots (records) in store
    const first = { ...store.getState().mapping };
    store.set('records', [first, first]);

    const json = buildJson();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(2); // only confirmed snapshots are exported

    // Each entry should have cells root
    json.forEach((entry) => {
      expect(entry).toHaveProperty('cells');
      expect(entry.cells).toHaveProperty('title');
    });
  });

  // Removed array wrapping test on request; exporter now always returns an object.

  test('postJson handles 2xx response', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
    const res = await postJson('https://example.com', { foo: 'bar' }, mockFetch);
    expect(mockFetch).toHaveBeenCalled();
    expect(res).toEqual({ success: true });
  });

  test('postJson rejects on failure', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('err') });
    await expect(postJson('https://example.com', {}, mockFetch)).rejects.toThrow('POST failed');
  });
});
