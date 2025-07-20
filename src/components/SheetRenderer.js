import { store } from '../store.js';

/**
 * SheetRenderer component converts the currently active worksheet data array
 * into an HTML table for display. It subscribes to the store and re-renders
 * whenever workbook or activeSheet changes.
 */
export default class SheetRenderer {
  constructor({ parent = document.body } = {}) {
    this.parent = parent;
    this.table = document.createElement('table');
    this.table.className = 'sheet-renderer';
    this.table.style.display = 'none';
    this.parent.appendChild(this.table);

    this._onStoreChange = this._onStoreChange.bind(this);
    this.unsubscribe = store.subscribe(this._onStoreChange);
  }

  _onStoreChange(newState, prevState) {
    // Only re-render if workbook changed or active sheet changed
    const prevWb = prevState ? prevState.workbook : null;
    if (newState.workbook !== prevWb || (newState.workbook && prevWb && newState.workbook.activeSheet !== prevWb.activeSheet)) {
      this.render(newState.workbook);
    }
  }

  render(workbook) {
    // Clear existing contents
    while (this.table.firstChild) this.table.removeChild(this.table.firstChild);

    if (!workbook) {
      this.table.style.display = 'none';
      return;
    }

    this.table.style.display = '';
    const data = workbook.data[workbook.activeSheet] || [];

    const fragment = document.createDocumentFragment();

    data.forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((cell) => {
        const td = document.createElement('td');
        td.textContent = cell === null || cell === undefined ? '' : String(cell);
        tr.appendChild(td);
      });
      fragment.appendChild(tr);
    });

    this.table.appendChild(fragment);
  }

  destroy() {
    this.unsubscribe && this.unsubscribe();
    if (this.table.parentNode) this.table.parentNode.removeChild(this.table);
  }
}
