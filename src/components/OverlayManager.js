/**
 * OverlayManager renders absolutely-positioned <div> elements for each mapped
 * worksheet cell so the user can visually see – and subsequently drag – the
 * mapping after it has been created.  The overlays are simple DOM nodes for
 * now; a later task will enhance them with the real Shopify Draggable
 * behaviour.  The manager also listens for DraggableController `OVERLAY_MOVED`
 * custom events and mutates the relevant entry inside `store.mapping` so the
 * single source of truth remains the global store.
 */

import { store } from '../store.js';
import { colourForField } from '../utils/color.js';
import DraggableController, {
  OVERLAY_MOVED
} from '../dnd/DraggableController.js';

export default class OverlayManager {
  /**
   * @param {{ parent?: HTMLElement }} [opts]
   */
  constructor({ parent = document.body } = {}) {
    this.parent = parent;

    // Container that hosts all overlay divs.  It is positioned absolutely so
    // individual overlays can use coordinates relative to the page.
    this.container = document.createElement('div');
    this.container.className = 'overlay-container';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '0',
      height: '0',
      pointerEvents: 'none'
    });
    this.parent.appendChild(this.container);

    // Keep references so we can tear down listeners on destroy().
    this._onStoreChange = this._onStoreChange.bind(this);
    this._onOverlayMoved = this._onOverlayMoved.bind(this);

    this.unsubscribe = store.subscribe(this._onStoreChange);
    DraggableController.addEventListener(OVERLAY_MOVED, this._onOverlayMoved);

    // Register overlaysRoot with the controller.  The call is idempotent so we
    // can safely trigger it even if another component has already initialised
    // the controller.
    DraggableController.init({ overlaysRoot: this.container });
  }

  /* -------------------------------------------------------------------- */
  /* Store handling                                                       */
  /* -------------------------------------------------------------------- */

  _onStoreChange(newState, prevState) {
    if (newState.mapping !== (prevState && prevState.mapping)) {
      this._renderOverlays(newState);
    }
  }

  /**
   * Re-create overlay divs for the provided state.
   * @param {*} state – current store state
   */
  _renderOverlays(state) {
    // Clear previous overlays
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    const { workbook, mapping } = state;
    if (!workbook || !mapping) return;

    const activeSheet = workbook.activeSheet;
    if (!activeSheet) return;

    Object.entries(mapping).forEach(([field, addresses]) => {
      addresses.forEach((addr, index) => {
        if (addr.sheet !== activeSheet) return; // Only render overlays for the visible sheet

        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.dataset.field = field;
        overlay.dataset.index = index;
        overlay.dataset.r = addr.row;
        overlay.dataset.c = addr.col;

        // Although the container has pointer-events: none, individual overlays
        // should be interactive so users can drag them later.
        overlay.style.pointerEvents = 'auto';

        // Minimal visual style – later tasks will improve this.
        Object.assign(overlay.style, {
          position: 'absolute',
          border: `2px solid ${colourForField(field)}`,
          backgroundColor: 'rgba(255,255,255,0.6)',
          padding: '2px',
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
          userSelect: 'none'
        });

        overlay.textContent = field;

        // Enable keyboard accessibility so users can pick up and move the
        // overlay via Draggable's KeyboardSensor.  Adding tabindex="0" places
        // the element in the natural tab order which in turn allows the user
        // to activate the drag with the space/enter key as per WCAG
        // guidelines.
        overlay.tabIndex = 0;

        // Attempt to position the overlay on top of the target cell.  We look
        // up the <td> using the same data-r / data-c attributes employed by
        // SheetRenderer highlights.  If the cell is not found we skip – e.g.
        // when the sheet view has not been rendered yet.
        const td = document.querySelector(
          `table.sheet-renderer td[data-r="${addr.row}"][data-c="${addr.col}"]`
        );
        if (td) {
          const rect = td.getBoundingClientRect();
          const containerRect = this.container.getBoundingClientRect();
          // Position relative to container’s top/left so absolute coords are correct.
          overlay.style.top = `${rect.top - containerRect.top}px`;
          overlay.style.left = `${rect.left - containerRect.left}px`;
          overlay.style.width = `${rect.width}px`;
          overlay.style.height = `${rect.height}px`;
        }

        // Make the element draggable via native DnD for now – the real Shopify
        // Draggable wiring will come later.  This allows power users to at
        // least drag the overlay even before the full integration is done.
        overlay.draggable = true;

        this.container.appendChild(overlay);
      });
    });
  }

  /* -------------------------------------------------------------------- */
  /* Overlay move handling                                                */
  /* -------------------------------------------------------------------- */

  /**
   * Listener called when DraggableController emits an OVERLAY_MOVED custom
   * event.  The detail object MUST include at least: { field, index, row, col }
   * and MAY provide sheet.  We mutate the mapping entry in the store
   * accordingly.
   */
  _onOverlayMoved(e) {
    if (!e || !e.detail) return;
    const { field, index, row, col, sheet: sheetFromDetail } = e.detail;
    if (!field || index == null || row == null || col == null) return;

    const state = store.getState();
    const sheet = sheetFromDetail || state.workbook?.activeSheet;
    if (!sheet) return;

    const mapping = { ...state.mapping };
    const list = mapping[field] ? [...mapping[field]] : [];
    if (index < 0 || index >= list.length) return;

    list[index] = { sheet, row, col };
    mapping[field] = list;
    store.set('mapping', mapping);
  }

  /* -------------------------------------------------------------------- */
  /* Cleanup                                                              */
  /* -------------------------------------------------------------------- */

  destroy() {
    this.unsubscribe && this.unsubscribe();
    DraggableController.removeEventListener(OVERLAY_MOVED, this._onOverlayMoved);
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
  }
}
