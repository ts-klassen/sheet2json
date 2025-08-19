// Unit test for Requirement 4 – verifies that the keyboard-accessible drag
// workflow (represented by Draggable's KeyboardSensor in our design) is wired
// through the same custom event channel as pointer/touch drags.  The test does
// **not** attempt to synthesise real key presses because the actual
// `@shopify/draggable` dependency is stubbed out at this stage of the
// migration.  Instead it performs three independent assertions:
//   1. MappingPanel list items expose `tabIndex = 0`, which places them in the
//      natural tab order so the KeyboardSensor can pick them up.
//   2. DraggableController registers a `KeyboardSensor` in its `sensors`
//      registry so the application will later be able to instantiate the real
//      sensor class.
//   3. Dispatching a synthetic FIELD_DROPPED event (standing in for the
//      KeyboardSensor drop callback) updates `store.mapping` – proving that
//      keyboard-initiated drags follow the exact same data path as mouse/touch
//      interactions.

import MappingPanel from '../src/components/MappingPanel.js';
import SheetRenderer from '../src/components/SheetRenderer.js';
import DraggableController from '../src/dnd/DraggableController.js';
import { FIELD_DROPPED } from '../src/dnd/DraggableController.js';
import { store } from '../src/store.js';

describe('Keyboard drag workflow (Requirement 4)', () => {
  let container;
  let panel;
  let renderer;

  beforeEach(() => {
    // Fresh DOM root per test case so component instances are isolated.
    container = document.createElement('div');
    document.body.appendChild(container);

    // Instantiate components under test.
    panel = new MappingPanel({ parent: container });
    renderer = new SheetRenderer({ parent: container });

    // Provide minimal store state – one field and a 1×1 worksheet.
    store.set('schema', {
      properties: {
        title: { type: 'string' }
      }
    });

    store.set('workbook', {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: { Sheet1: [['A1']] },
      merges: {}
    });

    // Ensure mapping starts empty for a deterministic baseline.
    store.set('mapping', {});
  });

  afterEach(() => {
    renderer.destroy();
    panel.destroy();
    document.body.innerHTML = '';

    // Reset mutated store slices so subsequent tests are unaffected.
    store.set('schema', null);
    store.set('workbook', null);
    store.set('mapping', {});
  });

  test('MappingPanel items are keyboard focusable (tabIndex = 0)', () => {
    const listItem = container.querySelector('li[data-field="title"]');
    expect(listItem).not.toBeNull();
    // JSDOM represents tabIndex as number (defaults to -1 when not set).
    expect(listItem.tabIndex).toBe(0);
  });

  test('DraggableController exposes a KeyboardSensor in its registry', () => {
    expect(DraggableController.sensors).toHaveProperty('KeyboardSensor');
  });

  test('Synthetic FIELD_DROPPED event updates mapping (keyboard drag simulation)', () => {
    const payload = { field: 'title', row: 0, col: 0, sheet: 'Sheet1' };

    // Pre-condition – mapping is empty.
    expect(store.getState().mapping).toEqual({});

    // Simulate “drop” at the end of a keyboard-initiated drag.  The
    // DraggableController helper routes the detail object through the same
    // internal code path used by pointer/touch drags, ultimately invoking the
    // SheetRenderer listener that mutates the store.
    DraggableController.__test_emit('field', payload);

    const { mapping } = store.getState();
    expect(mapping).toHaveProperty('title');
    expect(mapping.title).toHaveLength(1);
    expect(mapping.title[0]).toMatchObject({ sheet: 'Sheet1', row: 0, col: 0 });
  });
});
