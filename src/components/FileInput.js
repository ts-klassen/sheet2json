/**
 * FileInput component: renders an <input type="file"> element for workbook
 * uploads and notifies a callback when the user selects a file.
 *
 * Usage:
 *   import FileInput from './components/FileInput.js';
 *   const fi = new FileInput({
 *     parent: document.getElementById('app'),
 *     onFileSelected: (files) => {
 *       console.log(files);
 *     }
 *   });
 */

export default class FileInput {
  /**
   * @param {Object} opts
   * @param {HTMLElement} [opts.parent=document.body] Parent element to append to.
   * @param {(FileList|File[]) => void} [opts.onFileSelected] Callback when files selected.
   * @param {boolean} [opts.multiple=false] Allow multiple file selection.
   */
  constructor({ parent = document.body, onFileSelected, multiple = false } = {}) {
    this.parent = parent;
    this.onFileSelected = onFileSelected;

    // Container and dropzone UI
    this.container = document.createElement('div');
    this.container.className = 'file-input-container';

    this.dropzone = document.createElement('div');
    this.dropzone.className = 'file-dropzone';
    this.dropzone.tabIndex = 0;
    this.dropzone.setAttribute('role', 'button');
    this.dropzone.setAttribute('aria-label', 'Upload file. Drop here or press Enter to choose file.');
    this.dropzone.classList.add('empty');

    // Visible instructional text
    const dzText = document.createElement('div');
    dzText.className = 'file-dropzone-text';
    dzText.textContent = 'Drop a workbook here or click to choose';
    this.dropzone.appendChild(dzText);

    // Hidden native input retains browser file dialog and accessibility
    this.input = document.createElement('input');
    this.input.type = 'file';
    this.input.accept = '.xlsx,.xls,.csv';
    if (multiple) {
      this.input.multiple = true;
    }
    this.input.className = 'file-input-native';
    this.dropzone.appendChild(this.input);

    // Wire events
    this._handleChange = this._handleChange.bind(this);
    this._onDragOver = this._onDragOver.bind(this);
    this._onDragEnter = this._onDragEnter.bind(this);
    this._onDragLeave = this._onDragLeave.bind(this);
    this._onDrop = this._onDrop.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);

    this.input.addEventListener('change', this._handleChange);
    this.dropzone.addEventListener('dragover', this._onDragOver);
    this.dropzone.addEventListener('dragenter', this._onDragEnter);
    this.dropzone.addEventListener('dragleave', this._onDragLeave);
    this.dropzone.addEventListener('drop', this._onDrop);
    this.dropzone.addEventListener('keydown', this._onKeyDown);
    this.dropzone.addEventListener('click', () => this.input.click());

    // Compose nodes
    this.container.appendChild(this.dropzone);
    this.parent.appendChild(this.container);
  }

  _handleChange(event) {
    const { files } = event.target;
    if (files && files.length && typeof this.onFileSelected === 'function') {
      // Convert FileList to Array for convenience
      this.onFileSelected(Array.from(files));
      this.dropzone.classList.remove('empty');
    }
  }

  _onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.input.click();
    }
  }

  _onDragOver(e) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  _onDragEnter(e) {
    e.preventDefault();
    this.dropzone.classList.add('active');
  }

  _onDragLeave(e) {
    // Only deactivate when leaving the dropzone, not entering children
    if (e.target === this.dropzone) {
      this.dropzone.classList.remove('active');
    }
  }

  _onDrop(e) {
    if (!e.dataTransfer) return;
    e.preventDefault();
    this.dropzone.classList.remove('active');
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    // Filter by allowed extensions to mirror `accept` attribute
    const allowed = ['.xlsx', '.xls', '.csv'];
    const picked = files.filter((f) => {
      const name = (f && f.name) ? f.name.toLowerCase() : '';
      return allowed.some((ext) => name.endsWith(ext));
    });
    const toUse = picked.length > 0 ? picked : files;
    if (typeof this.onFileSelected === 'function') {
      this.onFileSelected(toUse);
    }
    if (toUse && toUse.length) {
      this.dropzone.classList.remove('empty');
    }
  }

  /**
   * Remove event listeners and DOM nodes.
   */
  destroy() {
    this.input.removeEventListener('change', this._handleChange);
    if (this.dropzone) {
      this.dropzone.removeEventListener('dragover', this._onDragOver);
      this.dropzone.removeEventListener('dragenter', this._onDragEnter);
      this.dropzone.removeEventListener('dragleave', this._onDragLeave);
      this.dropzone.removeEventListener('drop', this._onDrop);
      this.dropzone.removeEventListener('keydown', this._onKeyDown);
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
