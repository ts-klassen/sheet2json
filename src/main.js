/* Entry point for Sheet-to-JSON Mapper demo harness. */

import { store } from './store.js';
import { i18n, t, setLocale, getLocale, onChange as onI18nChange } from './i18n/index.js';
import FileInput from './components/FileInput.js';
import SheetPicker from './components/SheetPicker.js';
import SchemaInput from './components/SchemaInput.js';
import MappingPanel from './components/MappingPanel.js';
import { loadWorkbookFile } from './utils/workbookLoader.js';
import './autoDetector.js';
import SheetRenderer from './components/SheetRenderer.js';
import OverlayManager from './components/OverlayManager.js';
import { shiftMappingDown } from './utils/mappingUtils.js';
import ExportDialog from './components/ExportDialog.js';
import confirmDialog from './components/ConfirmDialog.js';
import '../styles/styles.css';

await i18n.init();
console.log('Sheet-to-JSON Mapper loaded');

const appEl = document.getElementById('app');

// Heading for smoke test
const heading = document.createElement('h1');
appEl.appendChild(heading);
function applyStaticTexts() {
  try { document.title = t('app.title'); } catch (_) {}
  heading.textContent = t('app.title');
}
applyStaticTexts();
onI18nChange(applyStaticTexts);

// Instantiate components
new FileInput({
  parent: appEl,
  onFileSelected: async (files) => {
    try {
      const wb = await loadWorkbookFile(files[0]);
      store.set('workbook', wb);
    } catch (err) {
      store.set('errors', [String(err)]);
    }
  }
});

new SheetPicker({ parent: appEl });
const schemaInput = new SchemaInput({ parent: appEl });

// Load schema from query param ?schema=URL (URL-encoded). Uses GET fetch.
// On success, fills the textarea and applies the schema to the store.
async function loadSchemaFromQuery() {
  try {
    if (typeof window === 'undefined' || !window.location) return;
    const params = new URLSearchParams(window.location.search);
    const url = params.get('schema');
    if (!url) return;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(`Failed to load schema: ${res.status}`);
    const text = await res.text();
    schemaInput.textarea.value = text;
    // Call component handler directly to parse + validate
    schemaInput._handleSchemaText(text);
    // If schema is valid, hide the schema editor/uploader UI
    const s = store.getState().schema;
    if (s && typeof s === 'object') {
      schemaInput.container.style.display = 'none';
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    await confirmDialog({
      title: t('errors.load_schema_title'),
      message: err.message || t('errors.load_schema_message'),
      confirmText: t('dialogs.ok'),
      cancelText: t('dialogs.dismiss')
    });
  }
}

loadSchemaFromQuery();

// ===========================================================================
// PUBLIC INTERFACE (STABLE) — DO NOT BREAK
// ---------------------------------------------------------------------------
// This module exposes a small, neutral, and versioned public API for
// integrations. Host applications MUST use ONLY this interface. Internal DOM,
// labels, and private functions may change at any time; the API below MUST
// remain backward compatible. If expanded, bump VERSION and preserve existing
// behavior.
//
// API surface (attached to window.Sheet2JSON):
//   - VERSION: string — semantic API version (e.g. '1.1.0').
//   - getJson(): object — returns current exported JSON, or throws if not ready.
//   - onConfirm(callback): function — subscribes to updates after each confirm
//       action. Returns an unsubscribe function. Subscriber errors are ignored.
//   - onUndo(callback): function — subscribes to updates after an undo. Returns
//       an unsubscribe function. Callback receives latest JSON or null.
//   - onChange(callback): function — subscribes to updates after any change
//       (confirm or undo). Returns an unsubscribe function. Callback receives
//       latest JSON or null.
//
// Additionally, two document-level CustomEvents are dispatched:
//   - 'sheet2json:ready'   — fired once when the API becomes available.
//       detail: { version: string }
//   - 'sheet2json:confirm' — fired after each successful confirm.
//       detail: <json object>
//   - 'sheet2json:undo'    — fired after an undo.
//       detail: <json object | null>
//   - 'sheet2json:change'  — fired after confirm and undo.
//       detail: <json object | null>
//
// IMPORTANT:
//   - This interface is intentionally neutral (no app-specific details).
//   - Do NOT remove or rename these members/events. Additive changes only.
// ===========================================================================

import { buildJson, findMissingRequiredFields } from './utils/exporter.js';
import { getSchemaProperties } from './utils/schemaUtils.js';

const __PUBLIC_API_VERSION = '1.1.0';
const __confirmSubscribers = new Set();
const __undoSubscribers = new Set();
const __changeSubscribers = new Set();

function __dispatchReady(version) {
  try {
    document.dispatchEvent(
      new CustomEvent('sheet2json:ready', { detail: { version } })
    );
  } catch (_) { /* ignore */ }
}

function __dispatchConfirm(json) {
  try {
    document.dispatchEvent(
      new CustomEvent('sheet2json:confirm', { detail: json })
    );
  } catch (_) { /* ignore */ }
}

function __dispatchUndo(json) {
  try {
    document.dispatchEvent(
      new CustomEvent('sheet2json:undo', { detail: json })
    );
  } catch (_) { /* ignore */ }
}

function __dispatchChange(json) {
  try {
    document.dispatchEvent(
      new CustomEvent('sheet2json:change', { detail: json })
    );
  } catch (_) { /* ignore */ }
}

function __notifyConfirm() {
  let json;
  try {
    json = buildJson();
  } catch (_) {
    json = null; // best-effort; never throw from notifier
  }
  if (json != null) {
    __confirmSubscribers.forEach((cb) => {
      try { cb(json); } catch (_) { /* ignore subscriber errors */ }
    });
    __dispatchConfirm(json);
  }
  // Always treat confirm as a change; allow consumers to handle null
  __changeSubscribers.forEach((cb) => {
    try { cb(json); } catch (_) { /* ignore subscriber errors */ }
  });
  __dispatchChange(json);
}

function __notifyUndo() {
  let json;
  try {
    json = buildJson();
  } catch (_) {
    json = null; // when no confirmed records remain
  }
  __undoSubscribers.forEach((cb) => {
    try { cb(json); } catch (_) { /* ignore subscriber errors */ }
  });
  __dispatchUndo(json);
  __changeSubscribers.forEach((cb) => {
    try { cb(json); } catch (_) { /* ignore subscriber errors */ }
  });
  __dispatchChange(json);
}

function __ensurePublicApi() {
  if (typeof window === 'undefined') return;
  if (window.Sheet2JSON && typeof window.Sheet2JSON === 'object') {
    // Already defined — preserve the first definition for stability.
    return;
  }
  const api = Object.freeze({
    VERSION: __PUBLIC_API_VERSION,
    getJson: () => buildJson(),
    onConfirm: (cb) => {
      if (typeof cb !== 'function') {
        throw new TypeError('onConfirm(callback) requires a function');
      }
      __confirmSubscribers.add(cb);
      return () => __confirmSubscribers.delete(cb);
    },
    onUndo: (cb) => {
      if (typeof cb !== 'function') {
        throw new TypeError('onUndo(callback) requires a function');
      }
      __undoSubscribers.add(cb);
      return () => __undoSubscribers.delete(cb);
    },
    onChange: (cb) => {
      if (typeof cb !== 'function') {
        throw new TypeError('onChange(callback) requires a function');
      }
      __changeSubscribers.add(cb);
      return () => __changeSubscribers.delete(cb);
    }
  });
  Object.defineProperty(window, 'Sheet2JSON', {
    value: api,
    writable: false,
    configurable: false
  });
  __dispatchReady(api.VERSION);
}

__ensurePublicApi();
// Control buttons – persists ("sticky") at the top of the viewport so the
// primary workflow actions remain accessible even when the user scrolls the
// worksheet far down.  The actual positioning rules live in the global
// stylesheet; here we only attach the semantic class.
const controls = document.createElement('div');
controls.className = 'controls-bar';
// Two internal rows inside the single sticky bar
const controlsTop = document.createElement('div');
controlsTop.className = 'controls-top';
const controlsBottom = document.createElement('div');
controlsBottom.className = 'controls-bottom';
controls.appendChild(controlsTop);
controls.appendChild(controlsBottom);

function makeButton(label, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.marginRight = '0.5em';
  // Forward the click event to the handler so callers can
  // inspect modifier keys (e.g. Shift-click for power actions).
  btn.addEventListener('click', (e) => onClick(e));
  return btn;
}

// Inline error helpers removed (using modal confirms instead)

// Template save/load feature removed

// Listen for inline error requests from components
// document-level inline-error listener removed

// Export JSON
controlsTop.appendChild(
  makeButton(t('controls.inspect_json'), async () => {
    try {
      // Validate required fields across the effective item schema.
      const state = store.getState();
      const snapshots = Array.isArray(state.records) ? state.records : [];
      const schema = state.schema;
      const props = getSchemaProperties(schema) || {};
      const toDisplay = (field) => {
        const meta = props[field] || {};
        return meta.description || meta.title || field;
      };
      // Aggregate missing fields across all snapshots (union)
      const missingSet = new Set();
      if (snapshots.length > 0) {
        snapshots.forEach((snap) => {
          findMissingRequiredFields(schema, snap).forEach((f) => missingSet.add(f));
        });
      } else {
        // No confirmed records yet — check the current working mapping if any
        findMissingRequiredFields(schema, state.mapping).forEach((f) => missingSet.add(f));
      }

      if (missingSet.size > 0) {
        const items = Array.from(missingSet).map(toDisplay);
        const proceed = await confirmDialog({
          title: t('dialogs.missing_required_title'),
          message: t('dialogs.missing_required_message_all'),
          items,
          note: t('dialogs.missing_required_note'),
          confirmText: t('dialogs.continue'),
          cancelText: t('dialogs.cancel')
        });
        if (!proceed) return;
      }

      const json = buildJson();
      new ExportDialog(json);
    } catch (err) {
      await confirmDialog({
        title: t('errors.inspect_title'),
        message: err.message || t('errors.inspect_message'),
        confirmText: t('dialogs.ok'),
        cancelText: t('dialogs.dismiss')
      });
    }
  })
);

// "Confirm & Next" button – snapshot current mapping & shift down one row
// Shift-click performs the operation 10 times in a row.
const confirmNextBtn = makeButton(t('controls.confirm_next'), async (e) => {
  try {
    const repeat = e && e.shiftKey ? 10 : 1;
    let warnedOnce = false;

    for (let i = 0; i < repeat; i++) {
      const state = store.getState();
      const mapping = state.mapping;
      if (!mapping || Object.keys(mapping).length === 0) {
        if (i === 0) {
          await confirmDialog({
            title: t('dialogs.nothing_to_confirm_title'),
            message: t('dialogs.nothing_to_confirm_message'),
            confirmText: t('dialogs.ok'),
            cancelText: t('dialogs.dismiss')
          });
        }
        break;
      }

      // Warn on missing required fields for the first iteration only; allow force-continue
      if (!warnedOnce) {
        const missing = findMissingRequiredFields(state.schema, mapping);
        const props = getSchemaProperties(state.schema) || {};
        const toDisplay = (field) => {
          const meta = props[field] || {};
          return meta.description || meta.title || field;
        };
        if (missing.length > 0) {
          const proceed = await confirmDialog({
            title: t('dialogs.missing_required_title'),
            message: t('dialogs.missing_required_message_record'),
            items: missing.map(toDisplay),
            note: t('dialogs.missing_required_note'),
            confirmText: t('dialogs.continue'),
            cancelText: t('dialogs.cancel')
          });
          if (!proceed) return;
        }
        warnedOnce = true;
      }

      shiftMappingDown();
      // Public interface notification: a successful confirm occurred.
      __notifyConfirm();
    }
  } catch (err) {
    await confirmDialog({
      title: t('errors.confirm_title'),
      message: err.message || t('errors.confirm_message'),
      confirmText: t('dialogs.ok'),
      cancelText: t('dialogs.dismiss')
    });
  }
});

controlsTop.appendChild(confirmNextBtn);

// Undo button – remove the last confirmed snapshot and restore overlays
controlsTop.appendChild(
  makeButton(t('controls.undo'), async (e) => {
    try {
      const repeat = e && e.shiftKey ? 10 : 1;
      for (let i = 0; i < repeat; i++) {
        const { records } = store.getState();
        if (!Array.isArray(records) || records.length === 0) {
          // Nothing to undo; stop quietly
          break;
        }
        const prevSnapshot = records[records.length - 1];
        const trimmed = records.slice(0, -1);
        // First remove the last record so exports reflect the undo
        store.set('records', trimmed);
        // Then restore mapping to the popped snapshot so overlays move back
        if (prevSnapshot && typeof prevSnapshot === 'object') {
          store.set('mapping', prevSnapshot);
        }
        // Notify integrations about undo and generic change
        __notifyUndo();
      }
    } catch (err) {
      await confirmDialog({
        title: t('errors.undo_title'),
        message: err.message || t('errors.undo_message'),
        confirmText: t('dialogs.ok'),
        cancelText: t('dialogs.dismiss')
      });
    }
  })
);

appEl.appendChild(controls);

// Checkbox to toggle visibility of gray shadow text in previously merged cells
const shadowToggleLabel = document.createElement('label');
shadowToggleLabel.style.marginLeft = '1em';
const shadowToggle = document.createElement('input');
shadowToggle.type = 'checkbox';
shadowToggle.style.marginRight = '0.25em';
shadowToggle.checked = !!store.getState().showMergeShadowText;
shadowToggle.addEventListener('change', () => {
  try {
    store.set('showMergeShadowText', shadowToggle.checked);
  } catch (err) {
    confirmDialog({
      title: t('errors.update_failed_title'),
      message: err.message || t('errors.update_failed_message'),
      confirmText: t('dialogs.ok'),
      cancelText: t('dialogs.dismiss')
    });
  }
});
shadowToggleLabel.appendChild(shadowToggle);
function updateShadowLabel() {
  // Rebuild label content: set text then reinsert the checkbox as first child
  const text = t('controls.show_merged_shadow');
  shadowToggleLabel.textContent = text;
  // Ensure the checkbox remains the first child
  shadowToggleLabel.insertBefore(shadowToggle, shadowToggleLabel.firstChild);
}
updateShadowLabel();
onI18nChange(updateShadowLabel);
controlsTop.appendChild(shadowToggleLabel);


new MappingPanel({ parent: controlsBottom });

// Sheet grid below controls
new SheetRenderer({ parent: appEl });

// Overlay layer lives on top of the sheet grid
new OverlayManager({ parent: appEl });


// Global discard area for overlays: dropping an overlay anywhere outside the
// sheet grid removes that mapping entry (same as clicking Remove in settings).
function handleGlobalDragOver(e) {
  if (!e.dataTransfer) return;
  const types = Array.from(e.dataTransfer.types || []);
  if (types.includes('application/x-overlay-move')) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
}

function handleGlobalDrop(e) {
  if (!e.dataTransfer) return;
  const payload = e.dataTransfer.getData('application/x-overlay-move');
  if (!payload) return; // not an overlay drop

  // If dropped inside the sheet grid, let SheetRenderer handle it.
  const inGrid = e.target && e.target.closest && e.target.closest('table.sheet-renderer');
  if (inGrid) return;

  e.preventDefault();
  try {
    const data = JSON.parse(payload);
    const { field, index } = data || {};
    if (!field || index == null) return;
    const state = store.getState();
    const mapping = { ...state.mapping };
    const list = Array.isArray(mapping[field]) ? [...mapping[field]] : [];
    if (index < 0 || index >= list.length) return;
    list.splice(index, 1);
    if (list.length > 0) mapping[field] = list; else delete mapping[field];
    store.set('mapping', mapping);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Discard drop failed:', err);
  }
}

document.addEventListener('dragover', handleGlobalDragOver);
document.addEventListener('drop', handleGlobalDrop);
