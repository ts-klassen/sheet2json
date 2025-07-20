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

    this.input = document.createElement('input');
    this.input.type = 'file';
    this.input.accept = '.xlsx,.xls,.csv';
    if (multiple) {
      this.input.multiple = true;
    }

    this._handleChange = this._handleChange.bind(this);
    this.input.addEventListener('change', this._handleChange);

    this.parent.appendChild(this.input);
  }

  _handleChange(event) {
    const { files } = event.target;
    if (files && files.length && typeof this.onFileSelected === 'function') {
      // Convert FileList to Array for convenience
      this.onFileSelected(Array.from(files));
    }
  }

  /**
   * Remove event listeners and DOM nodes.
   */
  destroy() {
    this.input.removeEventListener('change', this._handleChange);
    if (this.input.parentNode) {
      this.input.parentNode.removeChild(this.input);
    }
  }
}
