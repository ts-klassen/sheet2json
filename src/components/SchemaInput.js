import { store } from '../store.js';
import { getSchemaFields } from '../utils/schemaUtils.js';
import { colourForField } from '../utils/color.js';

/**
 * SchemaInput component allows users to paste or upload a JSON schema and
 * displays detected field names with colour swatches.
 */
export default class SchemaInput {
  constructor({ parent = document.body } = {}) {
    this.parent = parent;

    // Container
    this.container = document.createElement('div');
    this.container.className = 'schema-input';

    // Textarea for pasting JSON schema
    this.textarea = document.createElement('textarea');
    this.textarea.placeholder = 'Paste JSON schema here…';
    this.textarea.rows = 10;

    // File input for uploading .json file
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.json,application/json';

    // Sidebar list for fields
    this.sidebar = document.createElement('ul');
    this.sidebar.className = 'schema-fields';

    // Error message area
    this.errorEl = document.createElement('div');
    this.errorEl.className = 'schema-error';
    this.errorEl.style.color = 'red';

    this.container.appendChild(this.textarea);
    this.container.appendChild(this.fileInput);
    this.container.appendChild(this.errorEl);
    this.container.appendChild(this.sidebar);

    this.parent.appendChild(this.container);

    // Bind handlers
    this._onTextareaInput = this._onTextareaInput.bind(this);
    this._onFileChange = this._onFileChange.bind(this);

    this.textarea.addEventListener('input', this._onTextareaInput);
    this.fileInput.addEventListener('change', this._onFileChange);
  }

  _renderFields(fields) {
    this.sidebar.innerHTML = '';
    fields.forEach((field) => {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.marginBottom = '4px';

      // Make the preview field draggable so users can map directly from this
      // schema sidebar if they prefer.  Use the same MIME payload as
      // MappingPanel so SheetRenderer accepts the drop.
      li.draggable = true;
      li.addEventListener('dragstart', (ev) => {
        try {
          ev.dataTransfer.setData('application/x-schema-field', field);
          ev.dataTransfer.setData('text/plain', field);
          ev.dataTransfer.effectAllowed = 'copy';
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('dragstart failed on schema sidebar item', err);
        }
      });

      const swatch = document.createElement('span');
      swatch.style.display = 'inline-block';
      swatch.style.width = '1em';
      swatch.style.height = '1em';
      swatch.style.backgroundColor = colourForField(field);
      swatch.style.marginRight = '0.5em';
      swatch.style.pointerEvents = 'none';

      const text = document.createElement('span');
      text.textContent = field;
      text.style.pointerEvents = 'none';

      li.appendChild(swatch);
      li.appendChild(text);
      this.sidebar.appendChild(li);
    });

    // Add visual markers as requested for manual QA.
    const startMarker = document.createElement('div');
    startMarker.textContent = 'start drag SCHEMA list';
    startMarker.style.fontStyle = 'italic';
    startMarker.style.color = '#888';
    const endMarker = document.createElement('div');
    endMarker.textContent = 'end drag SCHEMA list';
    endMarker.style.fontStyle = 'italic';
    endMarker.style.color = '#888';

    this.sidebar.insertBefore(startMarker, this.sidebar.firstChild);
    this.sidebar.appendChild(endMarker);
  }

  _handleSchemaText(text) {
    if (!text.trim()) {
      this.errorEl.textContent = '';
      store.set('schema', null);
      this.sidebar.innerHTML = '';
      return;
    }

    try {
      const { schema, fields } = getSchemaFields(text);
      store.set('schema', schema);
      this.errorEl.textContent = '';
      this._renderFields(fields);
    } catch (err) {
      this.errorEl.textContent = err.message;
      store.set('schema', null);
      this.sidebar.innerHTML = '';
    }
  }

  _onTextareaInput(e) {
    this._handleSchemaText(e.target.value);
  }

  _onFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.textarea.value = reader.result;
      this._handleSchemaText(reader.result);
    };
    reader.readAsText(file);
  }

  destroy() {
    this.textarea.removeEventListener('input', this._onTextareaInput);
    this.fileInput.removeEventListener('change', this._onFileChange);
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
  }
}
