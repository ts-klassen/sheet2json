import SheetRenderer from '../src/components/SheetRenderer.js';
import { store } from '../src/store.js';
import DraggableController from '../src/dnd/DraggableController.js';

describe('Performance benchmark', () => {
  test('renders 500x50 grid within 1s', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const renderer = new SheetRenderer({ parent: container });

    const rows = 500;
    const cols = 50;
    const data = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => `${r}-${c}`));

    const wb = { sheets: ['S'], activeSheet: 'S', data: { S: data }, merges: {} };

    const t0 = performance.now();
    store.set('workbook', wb);
    const duration = performance.now() - t0;

    renderer.destroy();
    document.body.innerHTML = '';

    expect(duration).toBeLessThan(1000);
  });

  test('100 drag cycles complete within 200ms', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Instantiate a SheetRenderer so FIELD_DROPPED events update the mapping
    const renderer = new SheetRenderer({ parent: container });

    // Create a workbook with exactly 5 000 visible cells (100 rows × 50 cols)
    const rows = 100;
    const cols = 50;
    const data = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => `${r}-${c}`)
    );

    const wb = {
      sheets: ['S'],
      activeSheet: 'S',
      data: { S: data },
      merges: {}
    };

    store.set('workbook', wb);
    store.set('mapping', {});

    // Measure cumulative scripting time for 100 synthetic drag → drop cycles.
    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      const row = i % rows;
      const col = i % cols;
      // Dispatch synthetic FIELD_DROPPED event to emulate a successful drop
      DraggableController.__test_emit('field', {
        field: `field-${i}`,
        row,
        col,
        sheet: 'S'
      });
    }

    const elapsed = performance.now() - start;

    renderer.destroy();
    document.body.innerHTML = '';

    // Assert the entire loop stayed within the 200 ms budget.
    expect(elapsed).toBeLessThan(200);
  });
});
