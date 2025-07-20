# Requirements Document

## Introduction

The **Sheet-to-JSON Mapper** is a front-end-only web utility that lets users upload an Excel/CSV security questionnaire, visually map any cell(s) to a provided JSON schema through drag-and-drop, and finally export the mapped data as JSON to a caller-supplied callback URL.  By automating this otherwise manual, error-prone work, the tool accelerates responses to customer security check sheets and eliminates repetitive copy-and-paste effort.

### Requirement 1 – Workbook Input

**User Story:** As a security-sheet responder, I want to load an Excel or CSV file and pick the worksheet I need, so that I can start mapping the correct data source.

#### Acceptance Criteria

1. WHEN a user selects a file supported by SheetJS (`.xlsx`, `.xls`, `.csv`) THEN system SHALL read the file entirely in the browser with no backend call.
2. IF the workbook contains multiple worksheets THEN system SHALL display the sheet names AND allow the user to choose one before rendering.
3. WHEN an unsupported or corrupt file is selected THEN system SHALL display a descriptive error message and SHALL NOT crash.

### Requirement 2 – Worksheet Rendering

**User Story:** As a user, I want the selected worksheet rendered faithfully as an HTML table, so that I can see and interact with the data accurately.

#### Acceptance Criteria

1. WHEN a worksheet is chosen THEN system SHALL render all rows and columns in a scrollable, read-only HTML `<table>`.
2. IF a cell belongs to a merged region THEN system SHALL show the value only in the region’s top-left cell AND visually mark the remaining cells as merged (e.g., greyed out).
3. IF a cell contains a formula THEN system SHALL display the evaluated value and SHALL ignore the formula text.

### Requirement 3 – Schema Input

**User Story:** As a user, I want to load a JSON schema that defines required fields, so that I know exactly what must be mapped.

#### Acceptance Criteria

1. WHEN a user uploads or pastes a JSON schema THEN system SHALL parse it client-side and list each top-level field in a sidebar.
2. WHEN the schema is invalid JSON THEN system SHALL show an inline validation error and SHALL prevent further mapping until corrected.

### Requirement 4 – Auto-Detection (Baseline)

**User Story:** As a user, I want the system to pre-fill obvious mappings, so that I spend less effort configuring common layouts.

#### Acceptance Criteria

1. WHEN both worksheet and schema are loaded THEN system SHALL perform a positional guess using a fixed rule set (e.g., `title → A1`, `description → B1`).
2. IF a guess is made for a field THEN system SHALL overlay the target cell with a unique highlight colour tied to that field.
3. IF no guess can be made for a field THEN system SHALL leave the field unassigned and mark it as *unmapped* in the sidebar.

### Requirement 5 – Interactive Mapping

**User Story:** As a user, I want to drag coloured highlights to any cell(s), so that I can correct or create mappings easily.

#### Acceptance Criteria

1. WHEN a user drags a field’s highlight onto a cell THEN system SHALL immediately associate that cell with the field and refresh the overlay.
2. IF a user assigns multiple cells to the same field THEN system SHALL export those cell values as an ordered array for that field.
3. WHEN a user removes the last cell for a field THEN system SHALL mark the field as *unmapped*.

### Requirement 6 – Mapping Templates

**User Story:** As a frequent user, I want to save the mapping configuration and reload it later, so that I avoid repeating setup steps.

#### Acceptance Criteria

1. WHEN a user clicks *Save Template* THEN system SHALL download a JSON file that pairs schema fields with absolute cell addresses.
2. WHEN a user imports a saved template AND the referenced cell addresses exist in the worksheet THEN system SHALL recreate all mappings automatically.
3. IF a cell address in the template is missing in the current worksheet THEN system SHALL flag the affected field as *unmapped* and notify the user.

### Requirement 7 – Completion & JSON Export

**User Story:** As a user, I want to finalise the mapping and send the resulting JSON to a provided URL, so that the data is delivered to the consuming system.

#### Acceptance Criteria

1. WHEN the user clicks *Complete* AND every schema field is mapped THEN system SHALL generate a JSON document conforming to the provided schema.
2. WHEN a callback URL has been supplied THEN system SHALL POST the JSON to that URL using HTTP `POST` and `application/json` content-type.
3. AFTER a successful POST THEN system SHALL display the JSON to the user for verification and allow download as a file.
4. IF the POST fails (network error or non-2xx response) THEN system SHALL show an error with a retry option without clearing the mapping state.

### Requirement 8 – Front-End-Only Deployment

**User Story:** As an infrastructure engineer, I want the tool to run entirely in the browser, so that deployment is as simple as hosting static files and no sensitive data leaves the client except to the chosen callback URL.

#### Acceptance Criteria

1. WHEN the application is built THEN it SHALL consist solely of static HTML, JavaScript and CSS files that can be served from any static file host.
2. IF a build step is used (bundling/minification) THEN the output SHALL be a self-contained bundle with no runtime server dependencies.

### Requirement 9 – Non-Functional Qualities

**User Story:** As a stakeholder, I want the tool to remain usable and responsive, so that users are not hindered by performance or accessibility issues.

#### Acceptance Criteria

1. WHEN rendering a worksheet up to 500 rows × 50 columns THEN system SHALL complete initial render within 1 second on a standard corporate laptop (latest Chrome).
2. WHEN users interact via drag-and-drop or scrolling THEN system SHALL respond within 100 ms.
3. WHEN users navigate solely via keyboard THEN all interactive elements SHALL be reachable via the Tab sequence.
