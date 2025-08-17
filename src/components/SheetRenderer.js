import { store } from '../store.js';
import { colourOutlineForField } from '../utils/color.js';
import DraggableController, { FIELD_DROPPED } from '../dnd/DraggableController.js';
import { getSchemaProperties } from '../utils/schemaUtils.js';
import { colToLetters } from '../utils/a1.js';

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

    // Lookup table that maps "row:col" → <td>.  It is rebuilt every time the
    // worksheet is rendered (i.e. when workbook or activeSheet changes).
    this._cellLookup = new Map();

    this._onStoreChange = this._onStoreChange.bind(this);
    this._onStoreMappingChange = this._onStoreMappingChange.bind(this);
    this.unsubscribe = store.subscribe(this._onStoreChange);
    this.unsubscribeMapping = store.subscribe(this._onStoreMappingChange);

    // Draggable Dropzone integration
    this._onFieldDropped = this._onFieldDropped.bind(this);
    DraggableController.addEventListener(FIELD_DROPPED, this._onFieldDropped);

    // Inform the controller about the drop target root so it can wire the real
    // Dropzone implementation at a later stage.  The method is idempotent –
    // see DraggableController for details.
    try {
      DraggableController.init({ dropRoot: this.table });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('DraggableController initialisation (dropRoot) failed', err);
    }

    // Drag-and-drop handlers for interactive mapping
    this._onDragOver = this._onDragOver.bind(this);
    this._onDrop = this._onDrop.bind(this);
    this.table.addEventListener('dragover', this._onDragOver);
    this.table.addEventListener('drop', this._onDrop);
  }

  // Convert zero-based column index to Excel-style letters (A, B, ..., Z, AA, AB, ...)
  _colIndexToLetters(idx) {
    return colToLetters(idx);
  }

  _onStoreChange(newState, prevState) {
    // Only re-render if workbook changed, active sheet changed, or shadow text toggle changed
    const prevWb = prevState ? prevState.workbook : null;
    const workbookChanged = newState.workbook !== prevWb;
    const activeChanged =
      newState.workbook &&
      prevWb &&
      newState.workbook.activeSheet !== prevWb.activeSheet;
    const shadowToggleChanged =
      prevState && newState.showMergeShadowText !== prevState.showMergeShadowText;
    const viewRangeChanged = prevState && newState.viewRange !== prevState.viewRange;
    if (workbookChanged || activeChanged || shadowToggleChanged || viewRangeChanged) {
      this.render(newState.workbook);
    }
  }

  _onStoreMappingChange(newState, prevState) {
    if (newState.mapping !== (prevState && prevState.mapping)) {
      this._applyHighlights(newState);
    }
  }

  _applyHighlights(state) {
    // Lazily create a cache of currently highlighted cell keys so we can do
    // incremental updates instead of wiping and re-painting the entire table
    // on every mapping mutation.  A *key* is the tuple "row:col" for the
    // active sheet – we ignore other sheets because they are not rendered.
    if (!this._highlightedKeys) {
      this._highlightedKeys = new Set();
    }

    const { workbook, mapping } = state;
    if (!workbook || !mapping) return;

    const sheetName = workbook.activeSheet;

    // Build a set of keys that *should* be highlighted after this update.
    const nextKeys = new Set();

    Object.entries(mapping).forEach(([field, addresses]) => {
      addresses.forEach(({ sheet, row, col }) => {
        if (sheet !== sheetName) return;
        const key = `${row}:${col}`;
        nextKeys.add(key);

        // If this key is new we have to apply the outline now.
        if (!this._highlightedKeys.has(key)) {
          const td = this._cellLookup.get(key);
          if (td) {
            td.style.outline = `2px solid ${colourOutlineForField(field, 0.5)}`;
            td.setAttribute('data-highlight', '');
          }
        }
      });
    });

    // Remove outlines for keys that are no longer present.
    this._highlightedKeys.forEach((key) => {
      if (!nextKeys.has(key)) {
        const td = this._cellLookup.get(key);
        if (td) {
          td.style.outline = '';
          td.removeAttribute('data-highlight');
        }
      }
    });

    // Replace cache with new set for next diff.
    this._highlightedKeys = nextKeys;
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
    // Build a lookup set of shadow cells (all cells covered by a merge range
    // except the top-left). We will render every cell individually (no
    // rowSpan/colSpan) and apply a "grayed out" style to these shadow cells
    // so users can still see the repeated value while understanding it comes
    // from a previously merged block.
    const shadowCells = new Set();
    merges.forEach((rng) => {
      for (let r = rng.s.r; r <= rng.e.r; r++) {
        for (let c = rng.s.c; c <= rng.e.c; c++) {
          if (r === rng.s.r && c === rng.s.c) continue; // skip top-left
          shadowCells.add(`${r}:${c}`);
        }
      }
    });

    const fragment = document.createDocumentFragment();

    // Reset cell lookup before rebuilding the table so stale references are
    // removed and memory does not leak across renders.
    this._cellLookup.clear();

    // Determine visible range from store; if absent, default to full data extents.
    const vr = store.getState().viewRange;
    let startRow = 0;
    let startCol = 0;
    let endRow = Math.max(0, data.length - 1);
    let endCol = data.reduce((m, row) => Math.max(m, (row || []).length), 0) - 1;
    if (
      vr &&
      vr.start && vr.end &&
      Number.isFinite(vr.start.row) && Number.isFinite(vr.start.col) &&
      Number.isFinite(vr.end.row) && Number.isFinite(vr.end.col)
    ) {
      startRow = Math.max(0, vr.start.row);
      startCol = Math.max(0, vr.start.col);
      endRow = Math.max(startRow, vr.end.row);
      endCol = Math.max(startCol, vr.end.col);
    }

    const maxCols = Math.max(0, endCol - startCol + 1);

    // Build header row with Excel-style column labels
    const thead = document.createElement('thead');
    const headerTr = document.createElement('tr');
    const cornerTh = document.createElement('th');
    cornerTh.className = 'corner-header';
    cornerTh.textContent = '';
    headerTr.appendChild(cornerTh);
    for (let c = 0; c < maxCols; c++) {
      const th = document.createElement('th');
      th.className = 'col-header';
      th.textContent = this._colIndexToLetters(startCol + c);
      headerTr.appendChild(th);
    }
    thead.appendChild(headerTr);
    fragment.appendChild(thead);

    const tbody = document.createElement('tbody');

    for (let r = startRow; r <= endRow; r++) {
      const row = data[r] || [];
      const tr = document.createElement('tr');

      // Row header with 1-based index
      const rowTh = document.createElement('th');
      rowTh.className = 'row-header';
      rowTh.textContent = String(r + 1);
      tr.appendChild(rowTh);
      for (let c = 0; c < maxCols; c++) {
        const td = document.createElement('td');
        const cellValue = row[startCol + c];
        const text = cellValue === null || cellValue === undefined ? '' : String(cellValue);
        td.dataset.r = r;
        td.dataset.c = startCol + c;

        // Store reference for fast lookup during highlight updates.
        this._cellLookup.set(`${r}:${startCol + c}`, td);

        // Apply grayed-out style to shadow cells of previously merged ranges
        if (shadowCells.has(`${r}:${startCol + c}`)) {
          td.classList.add('merge-shadow');
          // Either show truncated text or nothing depending on user setting
          const showShadow = !!store.getState().showMergeShadowText;
          if (showShadow) {
            // Shadow cells: show up to 10 chars then append "..." if longer.
            td.textContent = text.length > 10 ? `${text.slice(0, 10)}...` : text;
            td.removeAttribute('title');
            td.style.cursor = '';
          } else {
            td.textContent = '';
            td.removeAttribute('title');
            td.style.cursor = '';
          }
        } else {
          // Normal (black) cells: show full text up to 100 chars; if longer,
          // display a hint and reveal full value on hover.
          if (text.length > 100) {
            td.textContent = '[hover me; or click to expand]';
            td.removeAttribute('title');
            td.dataset.fulltext = text;
            td.classList.add('hover-reveal');
            td.style.cursor = 'pointer';
            // Click to expand to full, black text
            td.addEventListener('click', () => {
              const full = td.dataset.fulltext || '';
              td.textContent = full;
              td.classList.remove('hover-reveal');
              td.removeAttribute('data-fulltext');
              td.style.cursor = '';
            }, { once: true });
          } else {
            td.textContent = text;
            td.removeAttribute('title');
            td.removeAttribute('data-fulltext');
            td.classList.remove('hover-reveal');
            td.style.cursor = '';
          }
        }

        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    fragment.appendChild(tbody);
    this.table.appendChild(fragment);

    // Apply highlights after DOM built
    this._applyHighlights(store.getState());
  }

  destroy() {
    this.unsubscribe && this.unsubscribe();
    this.unsubscribeMapping && this.unsubscribeMapping();
    this.table.removeEventListener('dragover', this._onDragOver);
    this.table.removeEventListener('drop', this._onDrop);

    DraggableController.removeEventListener(FIELD_DROPPED, this._onFieldDropped);
    if (this.table.parentNode) this.table.parentNode.removeChild(this.table);
  }

  /**
   * Handler for DraggableController FIELD_DROPPED custom events.  Expects the
   * event detail to contain at least `{ field, row, col }` and optionally
   * `sheet`.  If `sheet` is omitted we default to the currently active sheet
   * from the store.
   *
   * The method mirrors the logic in the legacy HTML5 `_onDrop` handler so that
   * both code paths yield identical `store.mapping` shapes.
   */
  _onFieldDropped(e) {
    if (!e || !e.detail) return;
    const { field, row, col, sheet: sheetFromDetail } = e.detail;

    if (!field || row == null || col == null) return;

    const state = store.getState();
    const sheet = sheetFromDetail || state.workbook?.activeSheet;
    if (!sheet) return;

    const newAddr = { sheet, row, col, dy: 1, dx: 0, jumpNext: true };
    const mapping = { ...state.mapping };
    const existing = mapping[field] ? [...mapping[field]] : [];

    // Determine if schema allows multiple addresses for this field
    const props2 = getSchemaProperties(state.schema);
    const isArrayProp = !!(props2 && props2[field] && props2[field].type === 'array');

    if (isArrayProp) {
      // Avoid duplicate addresses for the same field -> cell combination.
      const duplicate = existing.some(
        (addr) => addr.sheet === sheet && addr.row === row && addr.col === col
      );
      if (duplicate) return;
      existing.push(newAddr);
      mapping[field] = existing;
    } else {
      // Single mapping only – replace or create the first entry while
      // preserving any movement config from the previous one.
      const prev = existing[0] || {};
      mapping[field] = [{ ...prev, ...newAddr }];
    }

    store.set('mapping', mapping);
  }

  _onDragOver(e) {
    // Allow drop by preventing default
    if (!e.dataTransfer) return;

    const types = Array.from(e.dataTransfer.types || []);

    // Many browsers strip custom MIME types during dragover, leaving only
    // "text/plain" and "text/uri-list". Therefore, we allow text/plain here
    // and rely on _onDrop to perform strict validation (field must exist in
    // the loaded schema).
    if (
      types.includes('application/x-schema-field') ||
      types.includes('application/x-overlay-move') ||
      types.includes('text/plain')
    ) {
      e.preventDefault();
      // Convey correct cursor when moving an overlay.
      if (types.includes('application/x-overlay-move')) {
        e.dataTransfer.dropEffect = 'move';
      }
    }
  }

  _onDrop(e) {
    e.preventDefault();
    if (!e.dataTransfer) return;

    const overlayPayloadRaw = e.dataTransfer.getData('application/x-overlay-move');

    if (overlayPayloadRaw) {
      // ---------------------------------------------------------------
      // Overlay repositioning workflow (Requirement 3)
      // ---------------------------------------------------------------
      let payload;
      try {
        payload = JSON.parse(overlayPayloadRaw);
      } catch {
        // Malformed payload – ignore.
        return;
      }

      const { field, index } = payload || {};
      if (!field || index == null) return;

      const td = e.target.closest('td');
      if (!td) return;
      const row = parseInt(td.dataset.r, 10);
      const col = parseInt(td.dataset.c, 10);
      if (Number.isNaN(row) || Number.isNaN(col)) return;

      const state = store.getState();
      const sheet = state.workbook?.activeSheet;
      if (!sheet) return;

      const mapping = { ...state.mapping };
      const list = mapping[field] ? [...mapping[field]] : [];
      if (index < 0 || index >= list.length) return;

      // Avoid no-op / duplicate moves – if the addr stays identical do nothing.
      const existingAddr = list[index];
      if (existingAddr.sheet === sheet && existingAddr.row === row && existingAddr.col === col) {
        return;
      }

      // Prevent duplicates for the same field.
      const duplicate = list.some((addr, idx) =>
        idx !== index && addr.sheet === sheet && addr.row === row && addr.col === col
      );
      if (duplicate) return;

      const prev = list[index] || {};
      const dr = row - (prev.row ?? row);
      const dc = col - (prev.col ?? col);

      // Update leader
      list[index] = { ...prev, sheet, row, col };
      mapping[field] = list;

      // Follow: move any overlays configured to follow this leader by same delta
      try {
        const wb = store.getState().workbook;
        const applyDelta = (addr, deltaR, deltaC) => {
          const targetSheet = addr.sheet || (wb && wb.activeSheet) || sheet;
          const grid = (wb && wb.data && wb.data[targetSheet]) || [];
          const maxRows = grid.length;
          const newRow = (addr.row ?? 0) + deltaR;
          const newCol = (addr.col ?? 0) + deltaC;
          if (newRow < 0 || newRow >= maxRows) return null;
          const rowArr = grid[newRow] || [];
          if (newCol < 0 || newCol >= rowArr.length) return null;
          return { ...addr, row: newRow, col: newCol };
        };

        Object.entries(mapping).forEach(([fField, fListRaw]) => {
          const fList = Array.isArray(fListRaw) ? [...fListRaw] : [];
          let changed = false;
          fList.forEach((fAddr, fIdx) => {
            if (!fAddr || !fAddr.follow) return;
            if (fAddr.follow.field !== field) return;
            if (Number(fAddr.follow.index) !== Number(index)) return;
            const moved = applyDelta(fAddr, dr, dc);
            if (!moved) return;
            // Prevent duplicates within same field (excluding the follower itself)
            const dup = fList.some((a, i) => i !== fIdx && a.sheet === moved.sheet && a.row === moved.row && a.col === moved.col);
            if (dup) return;
            fList[fIdx] = moved;
            changed = true;
          });
          if (changed) mapping[fField] = fList;
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Follower move failed:', err);
      }

      store.set('mapping', mapping);

      return; // Done – handled overlay move.
    }

    // --------------------------------------------------------------------
    // Fallback: standard field→cell mapping (Requirement 1)
    // --------------------------------------------------------------------
    let field = e.dataTransfer.getData('application/x-schema-field');
    if (!field) {
      // Fallback for browsers that strip custom MIME types during dragover –
      // fall back to plain text *but* still validate against schema to avoid
      // arbitrary drops.
      field = e.dataTransfer.getData('text/plain');
    }

    if (!field) return;

    // Validate the field exists in the loaded schema – shields against random text.
    const { schema } = store.getState();
    const props = getSchemaProperties(schema);
    if (!props || !Object.prototype.hasOwnProperty.call(props, field)) {
      return; // Unknown field → ignore drop.
    }

    const td = e.target.closest('td');
    if (!td) return;
    const row = parseInt(td.dataset.r, 10);
    const col = parseInt(td.dataset.c, 10);
    if (Number.isNaN(row) || Number.isNaN(col)) return;

    const state = store.getState();
    const sheet = state.workbook?.activeSheet;
    if (!sheet) return;

    // Update mapping
    const newAddr = { sheet, row, col, dy: 1, dx: 0, jumpNext: true };
    const mapping = { ...state.mapping };
    const existing = mapping[field] ? [...mapping[field]] : [];

    // Determine if schema allows multiple addresses for this field
    const props2 = getSchemaProperties(state.schema);
    const isArrayProp = !!(props2 && props2[field] && props2[field].type === 'array');

    if (isArrayProp) {
      // Avoid duplicates then append
      if (!existing.some((addr) => addr.sheet === sheet && addr.row === row && addr.col === col)) {
        existing.push(newAddr);
        mapping[field] = existing;
      }
    } else {
      // Single mapping only – replace first while preserving prior config
      const prev = existing[0] || {};
      mapping[field] = [{ ...prev, ...newAddr }];
    }

    store.set('mapping', mapping);
  }
}
