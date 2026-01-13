import fs from 'fs';
import { ensureBuilt } from './helpers/ensureBuilt.js';

// Note: This is an integration-style test that loads the built bundle
// (dist/bundle.js) into JSDOM by injecting a <script> with inline content.
// It verifies the public API callbacks and events for confirm/undo/change.

describe('Public API integration', () => {
  function loadBundle() {
    const src = fs.readFileSync('dist/bundle.js', 'utf8');
    const script = document.createElement('script');
    script.textContent = src;
    document.body.appendChild(script);
  }

  function getButtonByText(txt) {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find((b) => (b.textContent || '').trim() === txt) || null;
  }

  test('onConfirm/onUndo/onChange callbacks and events', () => {
    // Fresh DOM with #app like dist/index.html
    document.body.innerHTML = '<div id="app"></div>';
    ensureBuilt();
    loadBundle();
    expect(window.Sheet2JSON).toBeTruthy();
    // Minimal state: workbook, schema, mapping
    const wb = {
      sheets: ['Sheet1'],
      activeSheet: 'Sheet1',
      data: { Sheet1: [['X']] },
      merges: {}
    };
    const schema = { type: 'object', properties: { foo: { type: 'string' } } };
    const mapping = { foo: [{ sheet: 'Sheet1', row: 0, col: 0 }] };

    // Access the store via global test hook
    const store = window.__STORE__;
    store.set('workbook', wb);
    store.set('schema', schema);
    store.set('mapping', mapping);
    store.set('records', []);

    const confirms = [];
    const undos = [];
    const changes = [];

    const offConfirm = window.Sheet2JSON.onConfirm((json) => confirms.push(json));
    const offUndo = window.Sheet2JSON.onUndo((json) => undos.push(json));
    const offChange = window.Sheet2JSON.onChange((json) => changes.push(json));

    const evs = { confirm: [], undo: [], change: [] };
    document.addEventListener('sheet2json:confirm', (e) => evs.confirm.push(e.detail));
    document.addEventListener('sheet2json:undo', (e) => evs.undo.push(e.detail));
    document.addEventListener('sheet2json:change', (e) => evs.change.push(e.detail));

    // Click Confirm & Next
    const confirmBtn = getButtonByText('Confirm & Next');
    expect(confirmBtn).toBeTruthy();
    confirmBtn.click();

    // Expect confirm and change to have fired once with JSON
    expect(confirms.length).toBe(1);
    expect(evs.confirm.length).toBe(1);
    expect(changes.length).toBeGreaterThanOrEqual(1);
    expect(evs.change.length).toBeGreaterThanOrEqual(1);
    expect(confirms[0]).toEqual({ cells: { foo: { cell: 'A1', value: 'X' } } });
    expect(evs.confirm[0]).toEqual({ cells: { foo: { cell: 'A1', value: 'X' } } });

    // Click Undo
    const undoBtn = getButtonByText('Undo');
    expect(undoBtn).toBeTruthy();
    undoBtn.click();

    // Expect undo and change to have fired; payload may be null when no records remain
    expect(undos.length).toBe(1);
    expect(evs.undo.length).toBe(1);
    expect(changes.length).toBeGreaterThanOrEqual(2);
    expect(evs.change.length).toBeGreaterThanOrEqual(2);
    expect(undos[0] === null || typeof undos[0] === 'object').toBe(true);
    expect(evs.undo[0] === null || typeof evs.undo[0] === 'object').toBe(true);

    // Dummy & Next should appear when schema includes dummy_flag and should not
    // poison mapping when undone (undo uses mapping snapshots to restore overlays).
    store.set('schema', { type: 'object', properties: { dummy_flag: { type: 'object' } } });
    store.set('mapping', {});
    store.set('records', []);

    const dummyBtn = getButtonByText('Dummy & Next');
    expect(dummyBtn).toBeTruthy();
    dummyBtn.click();
    expect(confirms[confirms.length - 1]).toEqual({ cells: { dummy_flag: { cell: '', value: '1' } } });

    undoBtn.click();
    expect(store.getState().mapping.dummy_flag).toBeUndefined();

    // Cleanup subscriptions
    offConfirm(); offUndo(); offChange();
  });
});
