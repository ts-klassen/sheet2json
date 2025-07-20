/* Entry point for Sheet-to-JSON Mapper.
 * For now this just verifies that the application bundle loads correctly.
 */

console.log('Sheet-to-JSON Mapper loaded');

// Render a simple placeholder so Cypress smoke test can assert DOM content.
const appEl = document.getElementById('app');
if (appEl) {
  const heading = document.createElement('h1');
  heading.textContent = 'Sheet-to-JSON Mapper';
  appEl.appendChild(heading);

// Attach components for demo/testing
import FileInput from './components/FileInput.js';
import { loadWorkbookFile } from './utils/workbookLoader.js';
import { store } from './store.js';
import SheetPicker from './components/SheetPicker.js';

new SheetPicker({ parent: appEl });

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
}
