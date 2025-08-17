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

---

### Custom JavaScript mode (per-overlay power feature)

If the simple Δ-row / Δ-column offsets are not flexible enough you can switch an overlay to **Custom JavaScript**.

Open the overlay dialog → choose *Custom JavaScript* and enter code that returns where the overlay should move to when **Confirm & Next** is pressed.

Callback signature

```js
// executed in a sandboxed Function
function (row, col, sheet, field, index, mapping) {
  /* your code */
  return something;
}
```

Parameters

1. `row`, `col` – current coordinates of the overlay.
2. `sheet`       – current sheet name (string).
3. `field`       – JSON-schema field this overlay maps.
4. `index`       – position in the `mapping[field]` array (0-based).
5. `mapping`     – the **entire** mapping object (`{ [field]: CellAddress[] }`), so you can inspect where other overlays are.

Return value (one of):

* **Number** – interpreted as *Δ rows*.  Example: `return 5;` moves down five rows; `return -1;` moves up one row.
* **Object** – absolute destination:

  ```js
  {
    row: 10,   // required if you omit Δ syntax
    col: 2,    // optional – omit to keep same column
    sheet: 'Sheet2' // optional – omit to stay on current sheet
  }
  ```

Examples

1. **Jump to first empty row below**

   ```js
   const data = workbook.data[sheet];
   let r = row + 1;
   while (r < data.length && data[r][col] !== '') r++;
   return { row: r, col };
   ```

2. **Align with the first overlay of another field**

   ```js
   // Move directly under the first "title" overlay
   const target = mapping.title?.[0];
   if (target) {
     return { row: target.row + 1, col: target.col };
   }
   return 1; // fallback: just go one row down
   ```

3. **Snake pattern across the sheet**

   ```js
   const cols = workbook.data[sheet][row].length;
   if (row % 2 === 0) {
     return col + 1 < cols ? { row, col: col + 1 } : { row: row + 1, col };
   }
   return col - 1 >= 0 ? { row, col: col - 1 } : { row: row + 1, col };
   ```

Limitations & safety

* Code runs with `new Function` in the browser context – keep it short and synchronous.
* Returned coordinates are clamped to the sheet bounds; invalid positions are ignored.
* Exceptions are caught and logged – if your script throws, the overlay will keep its position for that cycle.

This feature is designed for advanced users who need programmatic control over the mapping workflow.

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

Note: The previous mapping templates feature (save/load) has been removed.

---

## Troubleshooting

• Can’t start a drag with the keyboard?  Make sure the element has focus (`tabindex="0"`).

• Overlays appear behind cells?  The stylesheet must include `.overlay { position: absolute; z-index: 2; }`.

• Performance feels sluggish on large sheets?  Run `npm test -- tests/performance.test.js` and check the scripting budget (< 200 ms for 100 drags).  If the budget fails, profile with DevTools and watch for layout thrashing.

For more details refer to `workbench/specs/draggable-field-mapping/requirements.md` and `design.md`.

---

## Public API (Stable)

This tool exposes a small, neutral, and versioned public interface that hosts MUST use. Internal DOM, labels, and private helpers may change at any time; the API below must remain stable. Additive changes may be introduced over time; breaking changes require a major version bump.

Surface (window.Sheet2JSON)
- VERSION: semantic API version string (e.g., '1.0.0').
- getJson(): synchronously returns the current exported JSON; throws if workbook/schema/mapping is not ready.
- onConfirm(callback): subscribe to updates after each successful confirm; returns an unsubscribe function. Subscriber exceptions are ignored.

Events (document)
- 'sheet2json:ready': fired once when the API becomes available; detail: { version }.
- 'sheet2json:confirm': fired after each successful confirm; detail: the latest JSON object.

Semantics
- Successful confirm means one of:
  - advanceField mode: current field advanced (at least one cell mapped).
  - shiftRow mode: snapshot taken and mapping shifted (mapping non-empty).
- On success: onConfirm subscribers are called first, then 'sheet2json:confirm' is dispatched. If JSON generation fails, neither fires.

Access model
- Same-origin only: hosts should call `window.Sheet2JSON` on the opened tab/window reference. Cross-origin messaging is not part of this API.

Example (host tab)
```js
const w = window.open('/qna/static/sheet2json/index.html?schema=...');
const t = setInterval(() => {
  if (!w || w.closed) { clearInterval(t); return; }
  if (w.Sheet2JSON) {
    clearInterval(t);
    const off = w.Sheet2JSON.onConfirm((json) => {
      console.log('Confirmed JSON:', json);
    });
    // Optional on-demand fetch:
    // const current = w.Sheet2JSON.getJson();
  }
}, 250);
```

Contract
- Do not rely on internal implementation details; use only the API/events above.
- The API is versioned; hosts may check `Sheet2JSON.VERSION` to gate features.
