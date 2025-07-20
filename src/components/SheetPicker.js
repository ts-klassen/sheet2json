import { store } from '../store.js';

/**
 * SheetPicker component renders a <select> dropdown when the current workbook
 * contains multiple worksheets. Selecting an option updates Store.workbook.activeSheet.
 */
export default class SheetPicker {
  constructor({ parent = document.body } = {}) {
    this.parent = parent;
    this.selectEl = document.createElement('select');
    this.selectEl.style.display = 'none'; // Hidden by default until workbook with >1 sheets

    this._onStoreChange = this._onStoreChange.bind(this);
    this._onChange = this._onChange.bind(this);

    this.selectEl.addEventListener('change', this._onChange);

    this.unsubscribe = store.subscribe(this._onStoreChange);

    this.parent.appendChild(this.selectEl);
  }

  _onStoreChange(newState, prevState) {
    const { workbook } = newState;
    if (!workbook) {
      this.selectEl.style.display = 'none';
      return;
    }

    const { sheets = [], activeSheet } = workbook;
    if (sheets.length <= 1) {
      this.selectEl.style.display = 'none';
      return;
    }

    // Populate options if workbook changed or number of sheets differs
    if (!prevState || prevState.workbook !== workbook) {
      // Remove existing options
      while (this.selectEl.firstChild) {
        this.selectEl.removeChild(this.selectEl.firstChild);
      }
      sheets.forEach((sheetName) => {
        const option = document.createElement('option');
        option.value = sheetName;
        option.textContent = sheetName;
        this.selectEl.appendChild(option);
      });
    }

    this.selectEl.value = activeSheet;
    this.selectEl.style.display = '';
  }

  _onChange(e) {
    const sheetName = e.target.value;
    const current = store.getState().workbook;
    if (current && sheetName && current.activeSheet !== sheetName) {
      const updatedWorkbook = { ...current, activeSheet: sheetName };
      store.set('workbook', updatedWorkbook);
    }
  }

  destroy() {
    this.selectEl.removeEventListener('change', this._onChange);
    this.unsubscribe && this.unsubscribe();
    if (this.selectEl.parentNode) this.selectEl.parentNode.removeChild(this.selectEl);
  }
}
