import { store } from '../store.js';
import { colourForField } from '../utils/color.js';
import { getSchemaProperties } from '../utils/schemaUtils.js';
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

    // Visual markers requested for manual QA – indicate the draggable area
    // boundaries so testers can confirm that dragging is enabled only for the
    // intended list. These strings do not affect functionality or automated
    // tests.
    // End marker removed per request – no visual markers remain.
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
    if (!schema) return;

    const props = getSchemaProperties(schema);

    if (!props) return;

    const currentIndex = store.getState().currentFieldIndex ?? 0;

    Object.keys(props).forEach((field, idx) => {
      const li = document.createElement('li');
      li.dataset.field = field;
      // Make the element focusable so Draggable's KeyboardSensor can pick it
      // up via the standard space/enter key interaction once the sensor
      // receives focus events.  tabindex="0" ensures the item participates in
      // the natural tab order without requiring any additional ARIA roles.
      li.tabIndex = 0;
      li.style.margin = '4px 0';
      li.style.cursor = 'grab';
      li.style.userSelect = 'none';
      li.style.webkitUserSelect = 'none';

      // Use CSS to disable text selection; avoid preventing mousedown because
      // that blocks native HTML5 dragstart in some browsers.
      li.style.userSelect = 'none';

      const swatch = document.createElement('span');
      swatch.style.display = 'inline-block';
      swatch.style.width = '1em';
      swatch.style.height = '1em';
      swatch.style.backgroundColor = colourForField(field);
      swatch.style.marginRight = '0.5em';
      // Ensure click/drag events bubble to <li> so the native draggable
      // attribute on the list item captures the dragstart even when the user
      // initiates the gesture on the colour swatch.
      swatch.style.pointerEvents = 'none';

      const text = document.createElement('span');
      const labelSource = props?.[field] || {};
      text.textContent = labelSource.description || labelSource.title || field;
      text.style.pointerEvents = 'none';

      li.appendChild(swatch);
      li.appendChild(text);

      // ------------------------------------------------------------------
      // Provide a *native* HTML5 drag fallback **only** when Shopify Draggable
      // has not been wired (e.g. package not installed). Once Draggable is
      // active, the native attribute interferes with its PointerSensor, so we
      // must not set it.
      // ------------------------------------------------------------------

      if (!DraggableController.isWired()) {
        li.draggable = true;
        li.addEventListener('dragstart', (ev) => {
          try {
            ev.dataTransfer.setData('application/x-schema-field', field);
            ev.dataTransfer.setData('text/plain', field);
            ev.dataTransfer.effectAllowed = 'copy';
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('dragstart failed on field item', err);
          }
        });
      }

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
