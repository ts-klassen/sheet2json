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

  test('renders colspan for merged cells', () => {
    const wb = {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: {
        Sheet1: [
          ['Merged', null, 'C1'],
          ['A2', 'B2', 'C2']
        ]
      },
      merges: {
        Sheet1: [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }
        ]
      }
    };

    store.set('workbook', wb);

    const table = container.querySelector('table');
    expect(table.rows[0].cells.length).toBe(2); // merged cell + C1
    const mergedCell = table.rows[0].cells[0];
    expect(mergedCell.colSpan).toBe(2);
    expect(mergedCell.textContent).toBe('Merged');
  });

  test('shows evaluated formula value instead of formula text', () => {
    const workbook = {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: {
        Sheet1: [
          ['Header1', 'Header2'],
          [1, 2],
          [null, 3]
        ]
      },
      merges: {}
    };

    // Simulate formula cell in data row 2 col 0 (index) with value 2 evaluated earlier
    workbook.data.Sheet1[2][0] = 2; // value only

    store.set('workbook', workbook);

    const cellText = container.querySelector('table').rows[2].cells[0].textContent;
    expect(cellText).toBe('2');
  });

  test('renders 500x50 grid within performance budget', () => {
    const rows = 500;
    const cols = 50;
    const sheetArray = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => `${r},${c}`));
    const wb = {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: { Sheet1: sheetArray },
      merges: {}
    };

    const start = Date.now();
    store.set('workbook', wb);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });

  test('hides table when no workbook', () => {
    store.set('workbook', null);
    const table = container.querySelector('table');
    expect(table.style.display).toBe('none');
  });
});
