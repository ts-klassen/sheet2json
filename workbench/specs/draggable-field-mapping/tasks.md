# Implementation Plan

- [x] **1. Add Shopify Draggable dependency**  
  *Requirement 1, 4*  
  - Modify `package.json` to add `@shopify/draggable` as a dependency.  
  - Run `npm install` and ensure Rollup bundle succeeds.

- [x] **2. Create `src/dnd/DraggableController.js`**  
  *Requirements 1, 3, 4*  
  - Initialise Pointer, Touch and Keyboard sensors.  
  - Expose singleton with custom events `FIELD_DROPPED` & `OVERLAY_MOVED`.  
  - Unit-test with synthetic Draggable events.

- [x] **3. Refactor `src/components/MappingPanel.js` to use Draggable sources**  
  *Requirements 1, 4, 5*  
  - Replace native `dragstart` handler with Draggable initialisation.  
  - Add focus/active styling linked to `store.currentFieldIndex`.  
  - Ensure mirror element contains swatch + field name.

- [x] **4. Enhance `src/components/SheetRenderer.js` as Dropzone**  
  *Requirements 1, 5, 6*  
  4.1. Integrate Draggable Dropzone for `<td>` cells.  
  4.2. On drop, update `store.mapping` without altering the object shape.  
  4.3. Maintain/extend highlight logic using field colour.

- [ ] **5. Implement `src/components/OverlayManager.js`**  
  *Requirements 3, 5*  
  - Render absolutely-positioned overlay divs for every mapped cell.  
  - Register each overlay as a Draggable source sharing the same Dropzone.  
  - On move completion, mutate the corresponding address in `store.mapping`.

- [ ] **6. Extend global store (`src/store.js`)**  
  *Requirements 2, 6*  
  - Add `currentFieldIndex` with default `0`.  
  - Ensure deep-freeze helper covers the new key.

- [ ] **7. Build Next-button workflow**  
  *Requirement 2*  
  - Create/modify control button handler in `src/main.js`.  
  - Validate current field has mapping; push deep clone into `store.records`; increment `currentFieldIndex`; update MappingPanel focus.

- [ ] **8. Keyboard & touch accessibility**  
  *Requirement 4*  
  - Enable `KeyboardSensor` in DraggableController and add `tabindex="0"` to draggable list items & overlays.  
  - Verify touch sensor works on mobile emulator.

- [ ] **9. Unit tests (Jest)**  
  - [ ] 9.1. `draggable-field-drop.test.js` – field drop updates mapping (Req 1).  
  - [ ] 9.2. `overlay-move.test.js` – overlay reposition updates mapping (Req 3).  
  - [ ] 9.3. `next-workflow.test.js` – Next button snapshot & index advance (Req 2).  
  - [ ] 9.4. `keyboard-drag.test.js` – simulate keyboard sensor drag (Req 4).

- [ ] **10. Integration/E2E tests (Cypress)**  
  - Simulate drag → drop → Next flow and validate exporter output (Req 1–3).  
  - Mobile viewport long-press drag scenario (Req 4).

- [ ] **11. Performance test update**  
  *Requirement 7*  
  - Extend `tests/performance.test.js` to measure 100 drag cycles (<200 ms scripting budget).

- [ ] **12. Documentation**  
  *All requirements*  
  - Update `README.md` with new interaction instructions and keyboard shortcuts.
