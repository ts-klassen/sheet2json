# Requirements Document

## Introduction

The "Draggable Field Mapping" feature replaces the current native HTML-5 drag-and-drop behaviour with the Shopify **Draggable** library to give users a fluid, accessible and mobile-friendly workflow for connecting JSON-Schema fields to spreadsheet cells.  Users will be able to drag a schema field (or array element) onto a worksheet cell, lock-in the mapping via a "Next" action that builds a result array, and subsequently reposition a mapping by dragging the coloured overlay itself to a new cell.  The feature must work with mouse, touch and keyboard, maintain the existing data model, and keep the export pipeline unchanged.

### Requirement 1

**User Story:** As a data mapper, I want to drag a schema field onto a spreadsheet cell, so that the application records the mapping and highlights the cell.

#### Acceptance Criteria

1. WHEN the user starts dragging a field list item with mouse, touch or keyboard sensors THEN system SHALL create and show a styled drag “mirror” element containing the field name and colour swatch.
2. WHEN the drag mirror is dropped over a valid table cell THEN system SHALL append `{sheet, row, col}` to `store.mapping[field]` and outline the target cell with the field colour.
3. IF the drop occurs outside any cell THEN system SHALL cancel the operation and leave `store.mapping` unchanged.

### Requirement 2

**User Story:** As a data mapper, I want a "Next" button that finalises the current field mapping and automatically moves focus to the next unmapped field, so that I can map many fields quickly.

#### Acceptance Criteria

1. WHEN “Next” is pressed AND the current field has ≥ 1 mapped cell THEN system SHALL push a deep-clone snapshot of the current `mapping` into `store.records` (result array).
2. WHEN “Next” is pressed THEN system SHALL increment `store.currentFieldIndex` and visually emphasise the next unmapped field in the panel.
3. IF the current field has no mapped cell WHEN “Next” is pressed THEN system SHALL disable the button or display a warning and SHALL NOT advance the index.

### Requirement 3

**User Story:** As a data mapper, I want to reposition an already-mapped field by dragging its overlay between cells, so that I can correct mistakes without clearing the mapping first.

#### Acceptance Criteria

1. WHEN the user drags an overlay representing a mapped cell to another valid cell THEN system SHALL update that address inside `store.mapping[field]` and refresh highlights.
2. WHEN the drag is cancelled (esc key, drop outside table, or escape gesture) THEN system SHALL leave mapping unchanged.

### Requirement 4

**User Story:** As a mobile or keyboard user, I want full drag-and-drop functionality with touch gestures and keyboard controls, so that the tool is accessible on all devices.

#### Acceptance Criteria

1. WHEN the application runs on a touch-enabled device THEN system SHALL accept long-press or touch-move gestures to initiate and complete a drag.
2. WHEN the user focuses a draggable element with the keyboard THEN system SHALL support space/enter to pick up, arrow keys to move, and space/enter to drop, per Draggable’s KeyboardSensor spec.

### Requirement 5

**User Story:** As a visually oriented user, I want clear visual cues during and after dragging, so that I always know which field is active and which cells are mapped.

#### Acceptance Criteria

1. WHEN a field is successfully mapped THEN system SHALL outline each mapped cell with a 2 px solid border using the field’s deterministic colour.
2. WHEN a field becomes the current mapping target THEN system SHALL highlight its list item with a focus style (e.g., bold + blue outline).
3. WHEN the overlay is being dragged THEN system SHALL reduce the opacity of the source cell outline to indicate move-in-progress.

### Requirement 6

**User Story:** As a developer, I want the new feature to keep the existing data structures intact, so that other modules (exporter, template manager) work without modification.

#### Acceptance Criteria

1. WHEN the new drag behaviour updates mappings THEN system SHALL store them in the same shape: `mapping : { [field:string]: CellAddress[] }`.
2. WHEN templates are saved or loaded THEN system SHALL remain backward-compatible with existing template JSON files.

### Requirement 7

**User Story:** As a performance-conscious user, I want dragging to feel instantaneous even on large sheets, so that the UI remains pleasant under heavy data.

#### Acceptance Criteria

1. WHEN mapping a sheet of up to 5 000 visible cells THEN system SHALL complete drag start, move and drop cycles with < 200 ms cumulative scripting time, measured in Chrome DevTools performance profiler.
2. WHEN multiple overlays are present THEN system SHALL use CSS transforms or other GPU-accelerated techniques to avoid layout thrashing (> 60 fps target).

### Requirement 8

**User Story:** As a cross-browser user, I need the feature to work on the browsers supported by the project, so that I am not blocked by my environment.

#### Acceptance Criteria

1. WHEN the application is run in the latest two releases of Chrome, Edge, Firefox and Safari on desktop AND Safari/iOS and Chrome/Android on mobile THEN all drag, drop, and next-button operations SHALL succeed with no functional regressions.