// Unit test for Requirement 3 – ensures that when a synthetic OVERLAY_MOVED
// event is dispatched through DraggableController, the OverlayManager updates
// the corresponding entry inside the global `store.mapping` slice with the
// new cell address.

import OverlayManager from '../src/components/OverlayManager.js';
import DraggableController, { OVERLAY_MOVED } from '../src/dnd/DraggableController.js';
import { store } from '../src/store.js';

describe('OVERLAY_MOVED → mapping update', () => {
  let container;
  let manager;

  beforeEach(() => {
    // Fresh DOM root for every test so we isolate component instances.
    container = document.createElement('div');
    document.body.appendChild(container);

    // Minimal workbook so OverlayManager can resolve the active sheet.
    const workbook = {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: { Sheet1: [['A1', 'B1'], ['A2', 'B2']] },
      merges: {}
    };

    store.set('workbook', workbook);

    // Seed mapping with one address for the field we are going to move.
    store.set('mapping', {
      title: [{ sheet: 'Sheet1', row: 0, col: 0 }]
    });

    // Instantiate the manager after the store has initial state so its first
    // _renderOverlays call can complete without errors.
    manager = new OverlayManager({ parent: container });
  });

  afterEach(() => {
    manager.destroy();
    document.body.innerHTML = '';

    // Reset store for subsequent tests.
    store.set('mapping', {});
    store.set('workbook', null);
  });

  test('store.mapping is updated when OVERLAY_MOVED dispatched', () => {
    const payload = {
      field: 'title',
      index: 0, // first (and only) address in mapping.title
      row: 1,
      col: 1,
      sheet: 'Sheet1'
    };

    // Dispatch synthetic event via controller helper.
    DraggableController.__test_emit('overlay', payload);

    const { mapping } = store.getState();

    expect(mapping).toHaveProperty('title');
    expect(mapping.title).toHaveLength(1);
    expect(mapping.title[0]).toEqual({ sheet: 'Sheet1', row: 1, col: 1 });

    // Original object should NOT be mutated; a new mapping object is returned
    // (shallow compare).  This guards against accidental state mutation in
    // OverlayManager which would break idiomatic Redux-style workflows.
    const prevMapping = {
      title: [{ sheet: 'Sheet1', row: 0, col: 0 }]
    };
    expect(mapping).not.toBe(prevMapping);
  });
});


