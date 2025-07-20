# Sheet-to-JSON Mapper – Requirements

This document captures the **authoritative requirements** for the first public/internal release (v1) of the *Sheet-to-JSON* mapping tool derived from the user story, Q&A clarifications, and project goals.

## 1. Objective

Provide a purely front-end (static HTML/JS/CSS) web tool that lets users:

1. Upload a security-check Excel sheet (any format supported by SheetJS).
2. Visually map arbitrary cells to a supplied JSON schema via drag-and-drop.
3. Export the mapped data as JSON and POST it to a caller-supplied callback URL.

The tool eliminates manual copy-and-paste work when answering customers’ security questionnaires that arrive in inconsistent Excel formats.

## 2. In-Scope Features

### 2.1 Input Handling
• Accept file types supported by [SheetJS](https://sheetjs.com/) (e.g., `.xlsx`, `.xls`, `.csv`).  
• Allow the user to select which worksheet/tab to work with when multiple tabs are present.

### 2.2 Sheet Rendering
• Render the selected worksheet as an editable HTML `<table>` (readonly by default).  
• For merged cells, display the *top-left* value; visually indicate the merged region (greyed out or outline).  
• Show *evaluated* values for formula cells (formula text is ignored).

### 2.3 JSON Schema Input
• Accept a JSON Schema document uploaded/entered by the user each session.  
• The schema defines the *fields* that must be mapped (e.g., `title`, `description`, …).

### 2.4 Auto-Detection (v1)
• Perform a **simple positional guess** for each schema field (e.g., `title → A1`, `description → B1`, etc.).  
• Highlight guessed cells with distinct colours (one colour per field).  
• No confidence score is displayed.

### 2.5 Interactive Mapping
• Users can adjust a mapping by dragging a field’s colour overlay to a different cell.  
• Multiple cells may map to the same schema field; those values are exported as an *array* (order = visual/document order).  
• Users may optionally save the final mapping as a **template** (e.g., JSON file) and reload it for future workbooks with the same layout.

### 2.6 Completion & Export
• “Complete” button validates that every schema field has at least one mapped cell.  
• The tool transforms the mapping into a JSON document that conforms to the provided schema.  
• JSON is POSTed to a *caller-provided callback URL* (user supplies URL before completion).  
• After posting, present the JSON in a modal for user verification/download.

## 3. Non-Functional Requirements

| Category | Requirement |
| -------- | ----------- |
| Deployment | Runs entirely in the browser – no backend. Deliverable is a set of static files served from an internal web server. |
| Concurrency | Single-user usage assumed. |
| Performance | No formal SLA; must remain responsive (<100 ms UI latency) for typical security sheets (~a few hundred rows/columns). |
| Accessibility | Follow basic accessibility practices (semantic HTML, focusable elements). Full WCAG compliance **not required** for v1. |
| Internationalisation | UI language = English only for v1. |
| Security | Tool runs behind corporate network. No authentication, no encryption beyond what the hosting environment provides. No file contents are sent to any backend other than the user-specified callback. |
| Privacy | Workbook data stays in the browser; is transmitted only to the callback URL on completion. |

## 4. Technical Constraints & Stack

• **Front-end only**; plain (vanilla) JavaScript with optional lightweight helper libraries is preferred.  
• Use **SheetJS** for Excel/CSV parsing.  
• Avoid any build step if possible; if unavoidable, produce a single self-contained dist bundle.  
• Drag-and-drop may leverage native HTML5 DnD APIs or a minimal library (no heavy framework such as React/Vue).  
• Must work on latest Chrome and Chromium-based Edge (desktop). Other browsers optional.

## 5. Out-of-Scope (v1)

• Japanese localisation.  
• Multi-sheet simultaneous mapping.  
• Advanced auto-detection (ML/NLP).  
• User accounts, authentication or authorisation.  
• Detailed logging/monitoring.  
• Mobile browser support.

## 6. Glossary

*Mapping Template* — A persisted JSON description that pairs schema field names with absolute Excel cell addresses (e.g., `{ "title": ["A1"], "description": ["B1","B2"] }`).

---

**Document Owner:** Product/Engineering team  
**Version:** 1.0  (2025-07-20)
