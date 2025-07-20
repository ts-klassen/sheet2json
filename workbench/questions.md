# Questions for Sheet-to-JSON Requirements Clarification

Below is a first batch of questions that will help us convert the User Story into a precise, testable `workbench/requirement.md` document. Feel free to answer them in-line or leave comments—whatever is easiest for you.

## 1. Input Excel Characteristics
1.1 What versions of Excel files do we need to support? (`.xlsx` only, or also `.xls`, `.csv`, etc.)  
1.2 Do the security-check sheets usually contain multiple sheets/tabs? If so, should we always look at the first tab or let the user pick?  
1.3 What is the expected maximum file size or row/column count we should design for?  
1.4 Do the sheets ever contain merged cells, formulas, or images that we need to preserve or ignore?

## 2. Mapping Model
2.1 Is each **row** supposed to be mapped to one JSON object (e.g., one security question), or is the mapping more arbitrary (any cell can map to any schema field)?  
2.2 Will the same schema field sometimes appear multiple times in a sheet (e.g., multiple “description” cells)? If so, how should duplicates be handled?  
2.3 Do users need the ability to save a mapping template and re-apply it to another sheet with the same layout later?

## 3. Auto-Detection Expectations
3.1 How “smart” does the auto-detection have to be for the first release—simple header matching, or ML/NLP techniques?  
3.2 Should the confidence level of the guess be surfaced to the user (e.g., 80 % sure this is the “title” column)?

## 4. User Interaction & UI
4.1 Besides drag-and-drop, do we need other ways to adjust the mapping (e.g., dropdown selection, keyboard shortcuts)?  
4.2 Must the UI support Japanese localisation out of the box?  
4.3 Are there specific accessibility requirements (screen-reader friendly, WCAG level, etc.)?

## 5. Output & Integration
5.1 Should the generated JSON be returned **synchronously** in the HTTP response, or can the tool post it back to a callback URL when ready?  
5.2 What HTTP method/endpoint format does the Q&A system expect for both file upload and JSON return?  
5.3 Is there a versioning strategy for the JSON schema (so the tool knows which schema revision it is mapping to)?

## 6. Security & Compliance
6.1 Do we need user authentication/authorization, or is the tool internal-only behind a corporate VPN?  
6.2 Should uploaded Excel files be deleted immediately after conversion, or retained for audit/debug purposes?  
6.3 Any encryption requirements for data at rest or in transit? (e.g., TLS-only, AES-256 storage)

## 7. Technical Stack Constraints
7.1 You mentioned either Node.js or Python—does your team have a preference based on existing skill sets or deployment environment?  
7.2 Are there any restrictions on third-party libraries or licenses (e.g., only MIT/Apache-2.0)?  
7.3 Where will the app be deployed (on-premise server, AWS, GCP, etc.)?

## 8. Non-Functional Requirements
8.1 Expected concurrent user load (just a few internal users vs. many external clients)?  
8.2 Acceptable performance targets (e.g., map a 200-row sheet in under 5 seconds)?  
8.3 Logging and monitoring expectations (CloudWatch, Datadog, ELK, etc.)?

## 9. Future-Looking
9.1 Should we design with multi-sheet mapping in mind for future versions?  
9.2 Any plans to support non-Excel inputs (Google Sheets, CSV) down the line?

---

Answering these will let us draft `workbench/requirement.md` that is both comprehensive and actionable.
