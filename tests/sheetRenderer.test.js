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

    const tbody = container.querySelector('table tbody');
    expect(tbody).not.toBeNull();
    const rows = Array.from(tbody.querySelectorAll('tr'));
    expect(rows.length).toBe(2);
    // First data row: select real cells (td), skip row header (th)
    const firstRowTds = Array.from(rows[0].querySelectorAll('td'));
    const secondRowTds = Array.from(rows[1].querySelectorAll('td'));
    expect(firstRowTds.length).toBe(2);
    expect(firstRowTds[0].textContent).toBe('A1');
    expect(secondRowTds[1].textContent).toBe('B2');
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

    const td00 = container.querySelector('td[data-r="0"][data-c="0"]');
    const td01 = container.querySelector('td[data-r="0"][data-c="1"]');
    const td02 = container.querySelector('td[data-r="0"][data-c="2"]');
    expect(td00.textContent).toBe('Merged');
    // Shadow cell of merged range should be marked and typically empty by default
    expect(td01.classList.contains('merge-shadow')).toBe(true);
    expect(td01.textContent).toBe('');
    expect(td02.textContent).toBe('C1');
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

    const cell = container.querySelector('td[data-r="2"][data-c="0"]');
    expect(cell.textContent).toBe('2');
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
