import SheetRenderer from '../src/components/SheetRenderer.js';
import MappingPanel from '../src/components/MappingPanel.js';
import { store } from '../src/store.js';

class MockDataTransfer {
  constructor() {
    this.data = {};
    this.types = ['application/x-schema-field'];
  }
  setData(t, v) {
    this.data[t] = v;
  }
  getData(t) {
    return this.data[t];
  }
}

describe('Drag-and-drop mapping', () => {
  let container;
  let renderer;
  let panel;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new SheetRenderer({ parent: container });
    panel = new MappingPanel({ parent: container });

    // Set schema and workbook
    store.set('schema', { properties: { title: { type: 'string' } } });
    const wb = {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: { Sheet1: [['A1', 'B1']] },
      merges: {}
    };
    store.set('workbook', wb);
  });

  afterEach(() => {
    renderer.destroy();
    panel.destroy();
    document.body.innerHTML = '';
    store.set('mapping', {});
    store.set('schema', null);
    store.set('workbook', null);
  });

  test('dropping field onto cell updates mapping', () => {
    const td = container.querySelector('td[data-r="0"][data-c="1"]');
    expect(td).not.toBeNull();

    const dropEvt = new Event('drop', { bubbles: true, cancelable: true });
    dropEvt.dataTransfer = new MockDataTransfer();
    dropEvt.dataTransfer.setData('application/x-schema-field', 'title');
    td.dispatchEvent(dropEvt);

    const mapping = store.getState().mapping;
    expect(mapping).toHaveProperty('title');
    expect(mapping.title[0]).toEqual({ sheet: 'Sheet1', row: 0, col: 1 });
  });
});
