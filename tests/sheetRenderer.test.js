import SheetRenderer from '../src/components/SheetRenderer.js';
import { store } from '../src/store.js';

describe('SheetRenderer component', () => {
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
  });

  test('renders rows and cells matching workbook data', () => {
    const wb = {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: {
        Sheet1: [
          ['A1', 'B1'],
          ['A2', 'B2']
        ]
      }
    };

    store.set('workbook', wb);

    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect(table.rows.length).toBe(2);
    expect(table.rows[0].cells.length).toBe(2);
    expect(table.rows[0].cells[0].textContent).toBe('A1');
    expect(table.rows[1].cells[1].textContent).toBe('B2');
  });

  test('hides table when no workbook', () => {
    store.set('workbook', null);
    const table = container.querySelector('table');
    expect(table.style.display).toBe('none');
  });
});
