/* Entry point for Sheet-to-JSON Mapper demo harness. */

import { store } from './store.js';
import FileInput from './components/FileInput.js';
import SheetPicker from './components/SheetPicker.js';
import SchemaInput from './components/SchemaInput.js';
import MappingPanel from './components/MappingPanel.js';
import { loadWorkbookFile } from './utils/workbookLoader.js';
import './autoDetector.js';
import SheetRenderer from './components/SheetRenderer.js';
import OverlayManager from './components/OverlayManager.js';
import { buildJson } from './utils/exporter.js';
import { advanceCurrentField, shiftMappingDown } from './utils/mappingUtils.js';
import ExportDialog from './components/ExportDialog.js';
import '../styles/styles.css';

console.log('Sheet-to-JSON Mapper loaded');

const appEl = document.getElementById('app');

// Heading for smoke test
const heading = document.createElement('h1');
heading.textContent = 'Sheet-to-JSON Mapper';
appEl.appendChild(heading);

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
    // eslint-disable-next-line no-alert
    alert(err.message || 'Failed to load schema from URL');
  }
}

loadSchemaFromQuery();
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
  btn.addEventListener('click', onClick);
  return btn;
}

// Template save/load feature removed

// Export JSON
controlsTop.appendChild(
  makeButton('Export JSON', () => {
    try {
      const json = buildJson();
      new ExportDialog(json);
    } catch (err) {
      alert(err.message);
    }
  })
);

// "Confirm & Next" button – finalise current field mapping & advance focus
const confirmNextBtn = makeButton('Confirm & Next', () => {
    try {
      const { confirmNextMode } = store.getState();

      if (confirmNextMode === 'advanceField') {
        const success = advanceCurrentField();
        if (!success) {
          // eslint-disable-next-line no-alert
          alert('Please map at least one cell for the current field before continuing.');
        }
      } else {
        // Default & "shiftRow" path – always snapshot & shift mapping down.
        const mapping = store.getState().mapping;
        if (!mapping || Object.keys(mapping).length === 0) {
          // eslint-disable-next-line no-alert
          alert('Nothing to confirm – map at least one cell before continuing.');
          return;
        }
        shiftMappingDown();
      }
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err.message);
    }
  });

controlsTop.appendChild(confirmNextBtn);

// Secondary interaction – double-click opens the configuration dialog so
// users can switch between "shiftRow" and "advanceField" modes without diving
// into developer tools.  This behaviour is documented inside
// ConfirmNextConfigDialog but was not previously wired to the button.
confirmNextBtn.addEventListener('dblclick', () => {
  // Lazy-load to avoid upfront cost when users never open the dialog.
  import('./components/ConfirmNextConfigDialog.js').then(({ default: Dialog }) => {
    new Dialog();
  });
});

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
    alert(err.message);
  }
});
shadowToggleLabel.appendChild(shadowToggle);
shadowToggleLabel.appendChild(document.createTextNode('Show gray merged text'));
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
