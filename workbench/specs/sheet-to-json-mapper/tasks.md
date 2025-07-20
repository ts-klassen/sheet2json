# Implementation Plan

 - [x] **1. Project Scaffold & Tooling**  
  - Initialise vanilla JS project structure (`index.html`, `src/`, `styles/`).  
  - Install dev dependencies: SheetJS, Jest, Cypress, ESLint.  
  - Set up basic CI workflow running unit & E2E tests.

- [x] **2. Core State Store** *(Req 2.*, 3.*, 4.*, 5.*, 6.*)*  
  - [x] 2.1 Create `src/store.js` implementing observable pattern (subscribe/notify).  
  - [x] 2.2 Define state slices: `workbook`, `schema`, `mapping`, `errors`.  
  - [x] 2.3 Add unit tests for state mutations.

 - [x] **3. Workbook Input & Sheet Selection** *(Req 1.1 – 1.3)*  
  - [x] 3.1 Implement `FileInput` component (`src/components/FileInput.js`).  
  - [x] 3.2 Integrate SheetJS to parse `.xlsx`, `.xls`, `.csv`.  
  - [x] 3.3 Detect multiple worksheets and render sheet picker dialog.  
  - [x] 3.4 Error handling for unsupported/corrupt files.  
  - [x] 3.5 Unit tests with mock workbooks (good & corrupt).

 - [x] **4. Worksheet Renderer** *(Req 2.1 – 2.3)*  
  - [x] 4.1 Build `SheetRenderer` that converts worksheet array → HTML table.  
  - [x] 4.2 Render merged regions with visual overlay.  
  - [x] 4.3 Evaluate formula cells, ignore formula text.  
  - [x] 4.4 Ensure scroll performance for 500×50 grid (<1 s render).  
  - [x] 4.5 Component tests measuring render time.

 - [x] **5. Schema Input Panel** *(Req 3.1 – 3.2)*  
  - [x] 5.1 Implement `SchemaInput` component for file paste/upload.  
  - [x] 5.2 Validate JSON syntax and presence of `properties`.  
  - [x] 5.3 Display schema fields with colour swatches in sidebar.  
  - [x] 5.4 Unit tests for validation logic.

 - [x] **6. Auto-Detection Module** *(Req 4.1 – 4.3)*  
  - [x] 6.1 Implement `AutoDetector` with positional rule set.  
  - [x] 6.2 Populate `Store.mapping` and apply colour overlays.  
  - [x] 6.3 Unit tests verifying guesses for sample workbooks.

- [ ] **7. Interactive Mapping UI** *(Req 5.1 – 5.3)*  
  - [x] 7.1 Implement drag source logic in `MappingPanel`.  
  - [x] 7.2 Implement drop target logic in `SheetRenderer` overlay layer.  
  - [ ] 7.3 Support multi-cell selection per field -> mapping array.  
  - [ ] 7.4 Visual feedback for unmapped fields.  
  - [ ] 7.5 Component tests simulating drag-and-drop.

- [ ] **8. Template Manager** *(Req 6.1 – 6.3)*  
  - [ ] 8.1 Implement `saveTemplate(mapping)` → downloadable JSON.  
  - [ ] 8.2 Implement `loadTemplate(file)` with validation against current sheet.  
  - [ ] 8.3 Warning UI for missing cell addresses.  
  - [ ] 8.4 Unit tests for serialise/deserialise.

- [ ] **9. JSON Exporter & Callback** *(Req 7.1 – 7.4)*  
  - [ ] 9.1 Transform mapping → JSON respecting schema types (arrays/scalars).  
  - [ ] 9.2 Create `Exporter.post(url, json)` using `fetch`.  
  - [ ] 9.3 Display JSON modal & download link after success.  
  - [ ] 9.4 Error banner with retry on POST failure.  
  - [ ] 9.5 E2E tests for success & failure cases.

- [ ] **10. Build Script & Static Bundle** *(Req 8.1 – 8.2)*  
  - [ ] 10.1 Configure Rollup to bundle JS/CSS into single `dist/bundle.js`.  
  - [ ] 10.2 Verify output runs with `file://` protocol (no server).

- [ ] **11. Performance & Accessibility Validation** *(Req 9.1 – 9.3)*  
  - [ ] 11.1 Automated performance benchmark using `performance.now()` in Jest.  
  - [ ] 11.2 Integrate Axe-core accessibility checks in CI.  
  - [ ] 11.3 Manual keyboard navigation review.
