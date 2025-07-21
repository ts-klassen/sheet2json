# Sheet2JSON – Draggable Field Mapping Workflow

The **Draggable Field Mapping** feature replaces the previous native HTML-5 drag & drop implementation with the [Shopify **Draggable**](https://github.com/Shopify/draggable) library.  It delivers a faster, more accessible and mobile-friendly way to connect the columns / cells of an uploaded spreadsheet (XLSX, CSV) with the fields of a JSON-Schema.

---

## Quick-start

1. Install dependencies and start the dev server

   ```bash
   npm install
   npm run dev
   ```

2. Open `http://localhost:8080` and
   * select or drag a **workbook** file onto the drop zone,
   * paste or load a **JSON-Schema**, and
   * follow the steps below to map fields ➜ cells ➜ records.

---

## Mapping a field to a cell (mouse or touch)

1. In the **Mapping Panel** on the left, **drag** a field name (or array element) using the mouse, touch or stylus.
2. A coloured *drag mirror* follows the pointer/finger.
3. **Drop** the mirror onto a worksheet cell in the centre table.
4. The cell receives a 2&nbsp;px solid border in the field colour and the mapping is stored in `store.mapping`.

If the drop happens outside any cell, nothing changes – simply drag again.

---

## The “Confirm & Next” workflow

After at least one cell has been mapped, press **Confirm & Next** (or `Ctrl + →`).  What happens depends on the _Confirm-&-Next mode_ held in `store.confirmNextMode`:

• **'shiftRow'** (default) – The mapper stores a deep-clone snapshot of the current mapping in `store.records` and then shifts every mapped cell **down by one row**.  This is the fast-lane workflow for array-root schemas where you’re building a record set row-by-row.

• **'advanceField'** – The legacy behaviour: the snapshot is stored and focus jumps to the next unmapped field so you can continue dragging cells for that field.

Double-click a coloured overlay to open its **Row Increment** dialog.  Enter an integer (can be positive, zero, or negative):

• `1`, `2`, … – move down by that many rows.  
• `0` – stay on the same row (still snapshots each time).  
• `-1`, `-2`, … – move up.

The setting is stored per overlay and takes effect immediately.  The global behaviour mode (`shiftRow` vs `advanceField`) can still be adjusted via `store.confirmNextMode` if needed.

If there is no mapping to confirm the button shows an alert and nothing changes.

---

## Re-positioning an existing mapping

Each mapped cell displays a semi-transparent coloured **overlay**.  To move a mapping:

1. **Drag** the overlay itself to a new cell (mouse, touch or keyboard – see below).
2. On drop, the address inside `store.mapping[field]` is updated and the cell outlines refresh automatically.

Cancelling the drag (press *Esc* or drop outside the sheet) leaves the mapping unchanged.

---

## Keyboard controls (accessibility)

The Draggable **KeyboardSensor** makes the entire workflow accessible without a pointing device:

* **Tab** or **Shift + Tab** – Navigate to the next/previous draggable field or overlay.
* **Space / Enter** – Pick-up **or** drop the focused item.
* **Arrow keys** – While an item is picked-up, move the drag mirror one cell at a time.
* **Esc** – Cancel the drag and return the item to its original location.

On touch devices a *long-press* (≈ 300 ms) starts the drag.

---

## Data model compatibility

Although the interaction layer changed, the underlying structures remain **unchanged**:

```js
store.mapping  // { [field: string]: CellAddress[] }
store.records  // CellAddress[][] – snapshots created by “Confirm & Next”
```

Templates saved **before** the refactor still load without any modifications (see `Requirement 6`).

---

## Troubleshooting

• Can’t start a drag with the keyboard?  Make sure the element has focus (`tabindex="0"`).

• Overlays appear behind cells?  The stylesheet must include `.overlay { position: absolute; z-index: 2; }`.

• Performance feels sluggish on large sheets?  Run `npm test -- tests/performance.test.js` and check the scripting budget (< 200 ms for 100 drags).  If the budget fails, profile with DevTools and watch for layout thrashing.

For more details refer to `workbench/specs/draggable-field-mapping/requirements.md` and `design.md`.
