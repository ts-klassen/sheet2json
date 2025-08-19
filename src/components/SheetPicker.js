import { store } from '../store.js';
import confirmDialog from './ConfirmDialog.js';
import { parseA1Range, formatA1Range } from '../utils/a1.js';

/**
 * SheetPicker component renders a <select> dropdown when the current workbook
 * contains multiple worksheets. Selecting an option updates Store.workbook.activeSheet.
 */
export default class SheetPicker {
  constructor({ parent = document.body } = {}) {
    this.parent = parent;

    // Container to host sheet selector/name and range input side by side
    this.container = document.createElement('div');
    this.container.className = 'sheet-controls';
    this.container.style.display = 'flex';
    this.container.style.alignItems = 'center';
    this.container.style.gap = '0.5rem';

    this.selectEl = document.createElement('select');
    this.selectEl.style.display = 'none'; // Hidden by default until workbook with >1 sheets

    // Displayed when only a single sheet – shows the name inline
    this.sheetNameSpan = document.createElement('span');
    this.sheetNameSpan.className = 'sheet-name';
    this.sheetNameSpan.style.fontWeight = '600';
    this.sheetNameSpan.style.display = 'none';

    // Range input (A1:BZ99) – hidden until a sheet is loaded
    this.rangeLabel = document.createElement('label');
    this.rangeLabel.textContent = 'Range:';
    this.rangeLabel.style.marginLeft = '0.5rem';
    this.rangeLabel.style.display = 'none'; // hidden until workbook present
    this.rangeInput = document.createElement('input');
    this.rangeInput.type = 'text';
    // No placeholder – shows only real value after load
    this.rangeInput.size = 16;
    this.rangeInput.style.fontFamily = 'monospace';
    this.rangeLabel.appendChild(this.rangeInput);

    this._onStoreChange = this._onStoreChange.bind(this);
    this._onChange = this._onChange.bind(this);

    this.selectEl.addEventListener('change', this._onChange);
    this.rangeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._applyRangeFromInput();
    });
    this.rangeInput.addEventListener('blur', () => this._applyRangeFromInput());

    this.unsubscribe = store.subscribe(this._onStoreChange);

    this.container.appendChild(this.selectEl);
    this.container.appendChild(this.sheetNameSpan);
    this.container.appendChild(this.rangeLabel);
    this.parent.appendChild(this.container);
  }

  _onStoreChange(newState, prevState) {
    const { workbook } = newState;
    if (!workbook) {
      this.selectEl.style.display = 'none';
      this.sheetNameSpan.style.display = 'none';
      this.rangeLabel.style.display = 'none';
      return;
    }

    const { sheets = [], activeSheet } = workbook;
    if (sheets.length <= 1) {
      this.selectEl.style.display = 'none';
      this.sheetNameSpan.style.display = '';
      this.sheetNameSpan.textContent = activeSheet;
    } else {
      this.sheetNameSpan.style.display = 'none';
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

    if (sheets.length > 1) {
      this.selectEl.value = activeSheet;
      this.selectEl.style.display = '';
    }

    // Auto-fill range when workbook changes or sheet changes
    const prevWb = prevState ? prevState.workbook : null;
    const wbChanged = workbook !== prevWb;
    const prevActive = prevWb ? prevWb.activeSheet : null;
    const sheetChanged = prevWb && prevActive !== activeSheet;
    if (wbChanged || sheetChanged || !this.rangeInput.value) {
      const a1 = this._computeDefaultRangeA1(workbook);
      if (a1) {
        this.rangeInput.value = a1;
        const vr = parseA1Range(a1);
        if (vr) store.set('viewRange', vr);
      }
    }

    // Show the range controls once we have a valid workbook
    this.rangeLabel.style.display = '';
  }

  _onChange(e) {
    const sheetName = e.target.value;
    const current = store.getState().workbook;
    if (current && sheetName && current.activeSheet !== sheetName) {
      const updatedWorkbook = { ...current, activeSheet: sheetName };
      store.set('workbook', updatedWorkbook);
    }
  }

  _computeDefaultRangeA1(wb) {
    if (!wb) return '';
    const sheet = wb.activeSheet;
    const grid = (wb.data && wb.data[sheet]) || [];
    const endRow = Math.max(0, grid.length - 1);
    const endCol = grid.reduce((m, row) => Math.max(m, (row || []).length), 0) - 1;
    const start = { row: 0, col: 0 };
    const end = { row: Math.max(0, endRow), col: Math.max(0, endCol) };
    return formatA1Range({ start, end });
  }

  _applyRangeFromInput() {
    const str = this.rangeInput.value.trim();
    const vr = parseA1Range(str);
    if (!vr) {
      confirmDialog({
        title: 'Invalid range',
        message: 'Use format like A1:BZ99',
        confirmText: 'OK',
        cancelText: 'Dismiss'
      });
      return;
    }
    store.set('viewRange', vr);
  }

  destroy() {
    this.selectEl.removeEventListener('change', this._onChange);
    this.rangeInput && this.rangeInput.removeEventListener('keydown', this._applyRangeFromInput);
    this.unsubscribe && this.unsubscribe();
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
  }
}
