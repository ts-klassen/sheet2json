// Unit test for Requirement 1 – verifies that a synthetic FIELD_DROPPED event
// dispatched through the DraggableController updates the global store.mapping
// with the expected CellAddress.

import SheetRenderer from '../src/components/SheetRenderer.js';
import DraggableController, { FIELD_DROPPED } from '../src/dnd/DraggableController.js';
import { store } from '../src/store.js';

describe('FIELD_DROPPED → mapping update', () => {
  let container;
  let renderer;

  beforeEach(() => {
    // Fresh DOM container for every test so we isolate component instances
    container = document.createElement('div');
    document.body.appendChild(container);

    // Instantiate SheetRenderer – this component is responsible for listening
    // to FIELD_DROPPED and mutating the store.mapping slice.
    renderer = new SheetRenderer({ parent: container });

    // Provide minimal workbook so SheetRenderer has an active sheet context.
    const workbook = {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: { Sheet1: [['A1', 'B1']] },
      merges: {}
    };

    store.set('workbook', workbook);

    // Ensure mapping is empty at the beginning of every test.
    store.set('mapping', {});
  });

  afterEach(() => {
    renderer.destroy();
    document.body.innerHTML = '';

    // Reset relevant store slices so other tests start from a clean slate.
    store.set('mapping', {});
    store.set('workbook', null);
  });

  test('store.mapping is updated when FIELD_DROPPED dispatched', () => {
    const payload = { field: 'title', row: 0, col: 1, sheet: 'Sheet1' };

    // Dispatch synthetic event via the controller helper that the design
    // exposes explicitly for unit tests.
    DraggableController.__test_emit('field', payload);

    const { mapping } = store.getState();
    expect(mapping).toHaveProperty('title');
    expect(mapping.title).toHaveLength(1);
    expect(mapping.title[0]).toMatchObject({ sheet: 'Sheet1', row: 0, col: 1 });
  });
});
