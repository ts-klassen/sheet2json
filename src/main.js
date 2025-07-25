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
import { saveTemplate, loadTemplate } from './utils/templateManager.js';
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
// Control buttons
const controls = document.createElement('div');
controls.style.marginTop = '1em';

function makeButton(label, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.marginRight = '0.5em';
  btn.addEventListener('click', onClick);
  return btn;
}

// Save Template
controls.appendChild(
  makeButton('Save Template', () => {
    try {
      saveTemplate();
    } catch (err) {
      alert(err.message);
    }
  })
);

// Load Template (hidden file input)
const loadInput = document.createElement('input');
loadInput.type = 'file';
loadInput.accept = '.json,application/json';
loadInput.style.display = 'none';
loadInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await loadTemplate(file);
    alert('Template loaded');
  } catch (err) {
    alert(err.message);
  }
});
controls.appendChild(loadInput);

controls.appendChild(
  makeButton('Load Template', () => {
    loadInput.click();
  })
);

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

appEl.appendChild(controls);

new MappingPanel({ parent: appEl });

// Sheet grid below controls
new SheetRenderer({ parent: appEl });

// Overlay layer lives on top of the sheet grid
new OverlayManager({ parent: appEl });
