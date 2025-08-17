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
new SchemaInput({ parent: appEl });
// Control buttons – persists ("sticky") at the top of the viewport so the
// primary workflow actions remain accessible even when the user scrolls the
// worksheet far down.  The actual positioning rules live in the global
// stylesheet; here we only attach the semantic class.
const controls = document.createElement('div');
controls.className = 'controls-bar';

function makeButton(label, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.marginRight = '0.5em';
  btn.addEventListener('click', onClick);
  return btn;
}

// Template save/load feature removed

// Export JSON
controls.appendChild(
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

controls.appendChild(confirmNextBtn);

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

new MappingPanel({ parent: appEl });

// Sheet grid below controls
new SheetRenderer({ parent: appEl });

// Overlay layer lives on top of the sheet grid
new OverlayManager({ parent: appEl });
