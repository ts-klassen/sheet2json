import SheetRenderer from '../src/components/SheetRenderer.js';
import { store } from '../src/store.js';

describe('SheetRenderer highlights mapping', () => {
  let container;
  let renderer;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new SheetRenderer({ parent: container });
  });

  afterEach(() => {
    renderer.destroy();
    document.body.innerHTML = '';
    store.set('workbook', null);
    store.set('mapping', {});
  });

  test('applies outline style for mapped cells', () => {
    const wb = {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: { Sheet1: [['A1', 'B1']] },
      merges: {}
    };

    store.set('workbook', wb);

    // Map fieldA to cell A1
    store.set('mapping', {
      fieldA: [{ sheet: 'Sheet1', row: 0, col: 0 }]
    });

    const cell = container.querySelector('td[data-r="0"][data-c="0"]');
    expect(cell).not.toBeNull();
    expect(cell.style.outline).toContain('2px');
  });
});
