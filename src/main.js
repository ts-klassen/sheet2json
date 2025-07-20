/* Entry point for Sheet-to-JSON Mapper demo harness. */

import { store } from './store.js';
import FileInput from './components/FileInput.js';
import SheetPicker from './components/SheetPicker.js';
import SchemaInput from './components/SchemaInput.js';
import MappingPanel from './components/MappingPanel.js';
import { loadWorkbookFile } from './utils/workbookLoader.js';
import './autoDetector.js';
import SheetRenderer from './components/SheetRenderer.js';
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
new MappingPanel({ parent: appEl });

// Sheet grid
new SheetRenderer({ parent: appEl });
