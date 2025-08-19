import { store } from '../store.js';
import { colourForField, colourFillForField, registerFieldOrder } from '../utils/color.js';
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

    const fields = Object.keys(props);
    // Ensure a stable, sequential colour assignment to avoid near-duplicates
    registerFieldOrder(fields);

    // Determine required fields using the effective item schema
    const eff = (() => {
      const cellsDef = schema?.properties?.cells;
      if (cellsDef && cellsDef.type === 'array') {
        return cellsDef.items || cellsDef;
      }
      if (schema?.type === 'array' && schema.items) {
        return schema.items;
      }
      return schema || {};
    })();
    const requiredList = Array.isArray(eff?.required) ? eff.required : [];

    fields.forEach((field, idx) => {
      const li = document.createElement('li');
      li.dataset.field = field;
      // Make the element focusable so Draggable's KeyboardSensor can pick it
      // up via the standard space/enter key interaction once the sensor
      // receives focus events.  tabindex="0" ensures the item participates in
      // the natural tab order without requiring any additional ARIA roles.
      li.tabIndex = 0;
      li.style.margin = '0';
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
      swatch.style.backgroundColor = colourFillForField(field, 0.25);
      swatch.style.border = `1px solid ${colourForField(field)}`;
      swatch.style.borderRadius = '3px';
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

      // Styling rules:
      // - Array fields: always green (can always add more)
      // - Optional non-array: green if not placed; black when placed
      // - Required non-array: red if not placed; black when placed
      const meta = props?.[field] || {};
      const isArrayProp = meta.type === 'array';
      const isMapped = !!(mapping && mapping[field] && mapping[field].length > 0);
      const isRequired = requiredList.includes(field);
      if (isArrayProp) {
        // Arrays: always green and bold (can always add)
        text.style.color = 'green';
        text.style.fontWeight = 'bold';
      } else if (isRequired) {
        // Required non-array: red + bold if not placed; black when placed
        text.style.color = isMapped ? '' : 'red';
        text.style.fontWeight = isMapped ? 'normal' : 'bold';
      } else {
        // Optional non-array: green + bold if not placed; black when placed
        text.style.color = isMapped ? '' : 'green';
        text.style.fontWeight = isMapped ? 'normal' : 'bold';
      }

      // Highlight the active/current field (focus style)
      if (idx === currentIndex) {
        li.style.outline = '2px solid blue';
        li.style.outlineOffset = '2px';
      }

      // Native drag handling removed – now managed by DraggableController

      this.ul.appendChild(li);
    });

    // Trash chip removed – visible trash now lives in the controls bar

    // Visible trash dropzone next to draggables (not a draggable chip)
    if (this._trash && this._trash.parentNode) {
      this._trash.parentNode.removeChild(this._trash);
    }
    const trash = document.createElement('li');
    trash.className = 'trash-dropzone';
    trash.setAttribute('role', 'button');
    try {
      // Best-effort i18n for trash label
      // Avoid blocking render if i18n not yet initialised
      // eslint-disable-next-line promise/catch-or-return
      import('../i18n/index.js').then(({ t, onChange }) => {
        const apply = () => {
          trash.setAttribute('aria-label', t('controls.trash_aria'));
          trash.textContent = t('controls.trash');
        };
        apply();
        // update if locale changes while panel is mounted
        if (this._trashI18nUnsub) this._trashI18nUnsub();
        this._trashI18nUnsub = onChange(apply);
      });
    } catch (_) {
      trash.setAttribute('aria-label', 'Drop a box here to delete it');
      trash.textContent = '🗑 Trash';
    }

    const isOverlayMoveEvent = (e) => {
      if (!e || !e.dataTransfer) return false;
      const types = Array.from(e.dataTransfer.types || []);
      return types.includes('application/x-overlay-move');
    };
    ['dragenter', 'dragover'].forEach((evt) => {
      trash.addEventListener(evt, (e) => {
        if (!isOverlayMoveEvent(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        trash.classList.add('active');
      });
    });
    trash.addEventListener('dragleave', () => trash.classList.remove('active'));
    trash.addEventListener('drop', (e) => {
      if (!isOverlayMoveEvent(e)) return;
      e.preventDefault();
      trash.classList.remove('active');
      try {
        const payload = JSON.parse(e.dataTransfer.getData('application/x-overlay-move'));
        const { field, index } = payload || {};
        if (!field || index == null) return;
        const state = store.getState();
        const mapping2 = { ...state.mapping };
        const list = Array.isArray(mapping2[field]) ? [...mapping2[field]] : [];
        if (index < 0 || index >= list.length) return;
        list.splice(index, 1);
        if (list.length > 0) mapping2[field] = list; else delete mapping2[field];
        store.set('mapping', mapping2);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Trash drop failed:', err);
      }
    });
    this.ul.appendChild(trash);
    this._trash = trash;

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
    if (this._trashI18nUnsub) try { this._trashI18nUnsub(); } catch (_) {}
    this.unsubscribe && this.unsubscribe();
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
  }
}
