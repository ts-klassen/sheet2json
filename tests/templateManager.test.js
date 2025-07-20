import { store } from '../src/store.js';
import { saveTemplate, loadTemplate } from '../src/utils/templateManager.js';

describe('TemplateManager', () => {
  beforeEach(() => {
    // Setup workbook and mapping in store
    store.set('workbook', {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: { Sheet1: [['A1', 'B1'], ['A2', 'B2']] },
      merges: {}
    });
    store.set('mapping', {
      title: [{ sheet: 'Sheet1', row: 0, col: 0 }],
      desc: [{ sheet: 'Sheet1', row: 1, col: 1 }]
    });
  });

  afterEach(() => {
    store.set('mapping', {});
    store.set('workbook', null);
    store.set('errors', []);
  });

  test('saveTemplate returns valid JSON containing fields and sheetName', () => {
    const json = saveTemplate();
    const obj = JSON.parse(json);
    expect(obj.sheetName).toBe('Sheet1');
    expect(obj.fields.title[0].row).toBe(0);
  });

  test('loadTemplate applies mapping and reports missing cells', async () => {
    const templateJson = JSON.stringify({
      sheetName: 'Sheet1',
      fields: {
        title: [{ sheet: 'Sheet1', row: 0, col: 0 }],
        missingField: [{ sheet: 'Sheet1', row: 5, col: 5 }]
      }
    });

    const { missing } = await loadTemplate(templateJson);
    const mapping = store.getState().mapping;
    expect(mapping).toHaveProperty('title');
    expect(mapping).not.toHaveProperty('missingField');
    expect(missing.length).toBe(1);
  });
});
