import SheetRenderer from '../src/components/SheetRenderer.js';
import { store } from '../src/store.js';

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
});
