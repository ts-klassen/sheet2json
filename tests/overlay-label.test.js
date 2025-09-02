import OverlayManager from '../src/components/OverlayManager.js';
import { store } from '../src/store.js';

describe('Overlay label from description (left of colon)', () => {
  let container;
  let manager;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const workbook = {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: { Sheet1: [['A1', 'B1'], ['A2', 'B2']] },
      merges: {}
    };
    store.set('workbook', workbook);

    // Schema with descriptions that include colons
    store.set('schema', {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'title: some more text' },
        another: { type: 'string', description: 'label:text:some::more:::text:::' }
      }
    });

    // Mapping two overlays so we can assert both labels
    store.set('mapping', {
      title: [{ sheet: 'Sheet1', row: 0, col: 0 }],
      another: [{ sheet: 'Sheet1', row: 0, col: 1 }]
    });

    manager = new OverlayManager({ parent: container });
  });

  afterEach(() => {
    manager.destroy();
    document.body.innerHTML = '';
    store.set('mapping', {});
    store.set('schema', null);
    store.set('workbook', null);
  });

  test('uses text before first colon as overlay label', () => {
    const overlays = container.querySelectorAll('.overlay');
    expect(overlays.length).toBe(2);

    // Collect text contents keyed by field (via dataset)
    const map = {};
    overlays.forEach((ov) => {
      map[ov.dataset.field] = ov.textContent;
    });

    expect(map.title).toBe('title');
    expect(map.another).toBe('label');
  });
});

