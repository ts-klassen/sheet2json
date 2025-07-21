import { store } from '../store.js';
import { colourForField } from '../utils/color.js';
import DraggableController from '../dnd/DraggableController.js';

/**
 * MappingPanel lists schema fields as draggable items so the user can drag them
 * onto SheetRenderer cells (drag source part).
 */
export default class MappingPanel {
  constructor({ parent = document.body } = {}) {
    this.parent = parent;
    this.container = document.createElement('div');
    this.container.className = 'mapping-panel';

    // Unordered list to hold fields
    this.ul = document.createElement('ul');
    this.ul.style.listStyle = 'none';
    this.ul.style.padding = '0';

    this.container.appendChild(this.ul);
    this.parent.appendChild(this.container);

    this._onStoreChange = this._onStoreChange.bind(this);
    this.unsubscribe = store.subscribe(this._onStoreChange);
  }

  _onStoreChange(newState, prevState) {
    if (newState.schema !== (prevState && prevState.schema) || newState.mapping !== (prevState && prevState.mapping)) {
      this._render(newState.schema, newState.mapping);
    }
  }

  _render(schema, mapping) {
    this.ul.innerHTML = '';
    if (!schema || !schema.properties) return;

    const currentIndex = store.getState().currentFieldIndex ?? 0;

    Object.keys(schema.properties).forEach((field, idx) => {
      const li = document.createElement('li');
      li.dataset.field = field;
      li.style.margin = '4px 0';
      li.style.cursor = 'grab';
      li.style.userSelect = 'none';
      li.style.webkitUserSelect = 'none';

      // Prevent text selection so drag starts reliably when using PointerSensor
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });

      const swatch = document.createElement('span');
      swatch.style.display = 'inline-block';
      swatch.style.width = '1em';
      swatch.style.height = '1em';
      swatch.style.backgroundColor = colourForField(field);
      swatch.style.marginRight = '0.5em';

      const text = document.createElement('span');
      text.textContent = field;

      li.appendChild(swatch);
      li.appendChild(text);

      // Show unmapped fields in bold red, mapped in normal.
      if (!mapping || !mapping[field] || mapping[field].length === 0) {
        text.style.fontWeight = 'bold';
        text.style.color = 'red';
      }

      // Highlight the active/current field (focus style)
      if (idx === currentIndex) {
        li.style.outline = '2px solid blue';
        li.style.outlineOffset = '2px';
      }

      // Native drag handling removed – now managed by DraggableController

      this.ul.appendChild(li);
    });

    // (Re-)initialise draggable sources. Safe to call multiple times – the
    // controller ignores subsequent invocations after the first.
    try {
      DraggableController.init({ fieldsRoot: this.ul });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('DraggableController initialisation failed', err);
    }
  }

  destroy() {
    this.unsubscribe && this.unsubscribe();
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
  }
}
