import { store } from '../src/store.js';
import '../src/autoDetector.js';

describe('AutoDetector', () => {
  afterEach(() => {
    store.set('mapping', {});
    store.set('schema', null);
    store.set('workbook', null);
  });

  test('populates mapping based on positional rules', () => {
    // Prepare workbook state
    const wb = {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: { Sheet1: [['Title', 'Desc']] },
      merges: {}
    };

    // Prepare schema with title and description fields
    const schema = {
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        other: { type: 'string' }
      }
    };

    store.set('schema', schema);
    store.set('workbook', wb);

    const mapping = store.getState().mapping;
    expect(mapping).toHaveProperty('title');
    expect(mapping).toHaveProperty('description');
    expect(mapping).not.toHaveProperty('other');

    expect(mapping.title[0]).toMatchObject({ sheet: 'Sheet1', row: 0, col: 0 });
    expect(mapping.description[0]).toMatchObject({ sheet: 'Sheet1', row: 0, col: 1 });
  });
});
