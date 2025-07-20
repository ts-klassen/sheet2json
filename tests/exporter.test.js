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
  });

  test('buildJson respects array vs scalar', () => {
    const json = buildJson();
    expect(json.title).toBe('Title');
    expect(Array.isArray(json.notes)).toBe(true);
    expect(json.notes.length).toBe(2);
  });

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
