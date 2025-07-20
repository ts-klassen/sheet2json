import SheetPicker from '../src/components/SheetPicker.js';
import { store } from '../src/store.js';

describe('SheetPicker component', () => {
  let container;
  let picker;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    picker = new SheetPicker({ parent: container });
  });

  afterEach(() => {
    picker.destroy();
    document.body.innerHTML = '';
    // Reset store state
    store.setState({ workbook: null });
  });

  test('remains hidden when no workbook', () => {
    const select = container.querySelector('select');
    expect(select.style.display).toBe('none');
  });

  test('shows dropdown with sheet options and updates activeSheet', () => {
    const select = container.querySelector('select');
    const mockWorkbook = {
      sheets: ['Sheet1', 'Sheet2'],
      activeSheet: 'Sheet1',
      data: {}
    };

    store.set('workbook', mockWorkbook);

    expect(select.style.display).toBe('');
    expect(select.options.length).toBe(2);
    expect(select.value).toBe('Sheet1');

    // Change select value programmatically
    select.value = 'Sheet2';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(store.getState().workbook.activeSheet).toBe('Sheet2');
  });
});
