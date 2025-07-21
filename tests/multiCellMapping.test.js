import SheetRenderer from '../src/components/SheetRenderer.js';
import MappingPanel from '../src/components/MappingPanel.js';
import { store } from '../src/store.js';

class DT {
  constructor() {
    this.data = {};
    this.types = ['application/x-schema-field'];
  }
  setData(t, v) { this.data[t] = v; }
  getData(t) { return this.data[t]; }
}

function dropOnCell(cell, field) {
  const evt = new Event('drop', { bubbles: true, cancelable: true });
  evt.dataTransfer = new DT();
  evt.dataTransfer.setData('application/x-schema-field', field);
  cell.dispatchEvent(evt);
}

describe('Multi-cell mapping per field', () => {
  let container, renderer, panel;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new SheetRenderer({ parent: container });
    panel = new MappingPanel({ parent: container });

    store.set('schema', { properties: { tag: { type: 'string' } } });
    const arr = [
      ['A1', 'B1', 'C1'],
      ['A2', 'B2', 'C2']
    ];
    store.set('workbook', {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: { Sheet1: arr },
      merges: {}
    });
  });

  afterEach(() => {
    renderer.destroy();
    panel.destroy();
    document.body.innerHTML = '';
    store.set('mapping', {});
    store.set('schema', null);
    store.set('workbook', null);
  });

  test('adds multiple cells to mapping array', () => {
    const cell1 = container.querySelector('td[data-r="0"][data-c="0"]');
    const cell2 = container.querySelector('td[data-r="1"][data-c="2"]');

    dropOnCell(cell1, 'tag');
    dropOnCell(cell2, 'tag');

    const mapping = store.getState().mapping;
    expect(mapping.tag.length).toBe(2);
    // Ensure order preserved
    expect(mapping.tag[0]).toEqual({ sheet: 'Sheet1', row: 0, col: 0 });
    expect(mapping.tag[1]).toEqual({ sheet: 'Sheet1', row: 1, col: 2 });

    // MappingPanel should rerender field not in red (mapped)
    const listItem = container.querySelector('li[data-field="tag"] span:last-child');
    expect(listItem.style.color).not.toBe('red');
  });
});
