import { store } from '../store.js';
import { colourForField } from '../utils/color.js';

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
    this._onStoreMappingChange = this._onStoreMappingChange.bind(this);
    this.unsubscribe = store.subscribe(this._onStoreChange);
    this.unsubscribeMapping = store.subscribe(this._onStoreMappingChange);
  }

  _onStoreChange(newState, prevState) {
    // Only re-render if workbook changed or active sheet changed
    const prevWb = prevState ? prevState.workbook : null;
    if (newState.workbook !== prevWb || (newState.workbook && prevWb && newState.workbook.activeSheet !== prevWb.activeSheet)) {
      this.render(newState.workbook);
    }
  }

  _onStoreMappingChange(newState, prevState) {
    if (newState.mapping !== (prevState && prevState.mapping)) {
      this._applyHighlights(newState);
    }
  }

  _applyHighlights(state) {
    // Reset previous highlights
    const highlighted = this.table.querySelectorAll('[data-highlight]');
    highlighted.forEach((el) => {
      el.style.outline = '';
      el.removeAttribute('data-highlight');
    });

    const { workbook, mapping } = state;
    if (!workbook || !mapping) return;

    const sheetName = workbook.activeSheet;

    Object.entries(mapping).forEach(([field, addresses]) => {
      addresses.forEach(({ sheet, row, col }) => {
        if (sheet !== sheetName) return;
        const td = this.table.querySelector(`td[data-r="${row}"][data-c="${col}"]`);
        if (td) {
          td.style.outline = `2px solid ${colourForField(field)}`;
          td.setAttribute('data-highlight', '');
        }
      });
    });
  }

  render(workbook) {
    // Clear existing contents
    while (this.table.firstChild) this.table.removeChild(this.table.firstChild);

    if (!workbook) {
      this.table.style.display = 'none';
      return;
    }

    this.table.style.display = '';
    const sheetName = workbook.activeSheet;
    const data = workbook.data[sheetName] || [];
    const merges = (workbook.merges && workbook.merges[sheetName]) || [];

    // Build quick lookup map for merges
    const mergeLookup = new Map();
    merges.forEach((rng) => {
      const rowspan = rng.e.r - rng.s.r + 1;
      const colspan = rng.e.c - rng.s.c + 1;
      // Mark start cell with span info
      mergeLookup.set(`${rng.s.r}:${rng.s.c}`, { rowspan, colspan });
      // Mark other cells in range to be skipped
      for (let r = rng.s.r; r <= rng.e.r; r++) {
        for (let c = rng.s.c; c <= rng.e.c; c++) {
          if (r === rng.s.r && c === rng.s.c) continue;
          mergeLookup.set(`${r}:${c}`, null);
        }
      }
    });

    const fragment = document.createDocumentFragment();

    for (let r = 0; r < data.length; r++) {
      const row = data[r] || [];
      const tr = document.createElement('tr');
      // Determine total columns for this row as maximum between row length and merge columns
      let rowColCount = row.length;
      // Consider merges that extend beyond row length
      merges.forEach((rng) => {
        if (rng.s.r === r && rng.e.c + 1 > rowColCount) {
          rowColCount = rng.e.c + 1;
        }
      });

      // We'll iterate up to rowColCount or further if merges require.
      let c = 0;
      while (c < rowColCount) {
        const lookup = mergeLookup.get(`${r}:${c}`);
        if (lookup === null) {
          // Cell is merged and should be skipped.
          c += 1;
          continue;
        }

        const td = document.createElement('td');
        const cellValue = row[c];
        td.textContent = cellValue === null || cellValue === undefined ? '' : String(cellValue);
        td.dataset.r = r;
        td.dataset.c = c;

        if (lookup) {
          if (lookup.rowspan > 1) td.rowSpan = lookup.rowspan;
          if (lookup.colspan > 1) td.colSpan = lookup.colspan;
          // Style to indicate merged region visually
          td.style.backgroundColor = '#f0f0f0';
        }

        tr.appendChild(td);
        c += lookup && lookup.colspan ? lookup.colspan : 1;
      }
      fragment.appendChild(tr);
    }

    this.table.appendChild(fragment);

    // Apply highlights after DOM built
    this._applyHighlights(store.getState());
  }

  destroy() {
    this.unsubscribe && this.unsubscribe();
    this.unsubscribeMapping && this.unsubscribeMapping();
    if (this.table.parentNode) this.table.parentNode.removeChild(this.table);
  }
}
