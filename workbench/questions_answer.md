# Requirements Clarification Answers

## 1. Input Excel Characteristics
1.1 We support all formats SheetJS can handle (e.g., `.xlsx`, `.xls`, `.csv`).
1.2 Users can choose which tab to work with if the sheet has multiple tabs.
1.3 No specific maximum file size or row/column count because the files aren’t huge.
1.4 For merged cells, we use the top-left value, and the other cells will be empty or greyed out. For formulas, we only use the evaluated value.

## 2. Mapping Model
2.1 The mapping is flexible: any cell can map to any field in the JSON.
2.2 If the same schema field appears multiple times, we handle them as an array and let users adjust as needed.
2.3 Users can save a mapping template and re-apply it to future sheets.

## 3. Auto-Detection Expectations
3.1 Very simple auto-detection: we assume fixed positions like A1 for title, B1 for description, etc.
3.2 We don’t need to show any confidence levels—just simple logic.

## 4. User Interaction & UI
4.1 We only need drag-and-drop for adjusting mappings for now.
4.2 English-only UI for now, no Japanese localization required.
4.3 We follow basic accessibility standards but don’t need full compliance.

## 5. Output & Integration
5.1 The JSON output is posted back to a callback URL after conversion.
5.2 The HTTP method/endpoint format is flexible.
5.3 The JSON schema is uploaded each time, so versioning isn’t needed.

## 6. Security & Compliance
6.1 No authentication/authorization needed as it’s behind a secure internal environment.
6.2 No files are uploaded to a backend, everything runs in the frontend.
6.3 No encryption requirements as everything is local.

## 7. Technical Stack Constraints
7.1 No frontend frameworks needed, plain JavaScript is fine.
7.2 No third-party library restrictions.
7.3 Should be deployable as static HTML/JS/CSS files on an internal server.

## 8. Non-Functional Requirements
8.1 Only one user at a time (frontend only).
8.2 No specific performance targets.
8.3 No logging or monitoring needed.

## 9. Future-Looking (continued)
9.1 Multi-sheet mapping isn’t needed now, but we’ll keep it in mind for future updates, if it’s easy to add.
9.2 We won’t limit other input formats as long as SheetJS can handle them, otherwise we don’t worry about it now.

Everything runs entirely in the frontend, with no backend involved at all.
