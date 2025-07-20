# User Story and Requirements

## User Story
I work at a company developing SaaS software for Japanese businesses. When Japanese companies want to use external software, they send a "security check sheet" (usually in Excel) with lots of questions about our system's security setup. Each company has its own format, making the sheets inconsistent and difficult to handle.

I want to build a tool that can take these Excel files, help visually map them to a standardized JSON schema, and then return the mapped JSON data.

## Functional Requirements
1. The user uploads an Excel sheet with a unique format.
2. The tool displays the sheet visually as an HTML table.
3. The JSON schema (e.g., fields like "title" and "description") is provided.
4. The tool tries to auto-detect where the “title” and “description” fields are in the sheet.
5. Using colored highlights (e.g., red for “title,” blue for “description”), the tool visually marks where it thinks the fields are.
6. If the guess is correct, the user presses a “Next” or “Confirm” button to move on.
7. If the guess is wrong, the user can drag and drop the colored highlight to the correct cells.
8. The process repeats for each field (e.g., each new row or column).
9. Once all mappings are finalized, the user presses a “Complete” button.
10. The tool converts the mapped data into a JSON format based on the schema.

## Technical Requirements
- The Sheet-to-JSON tool should be a standalone web application.
- It should accept HTTP requests to receive Excel file uploads and JSON schemas.
- The tool displays the Excel sheet as an editable HTML table.
- It uses visual markers (colored highlights) to indicate detected fields.
- Drag-and-drop functionality is provided for adjusting the mapping.
- After confirming all mappings, the tool creates a JSON document based on the schema.
- The JSON data is returned to the caller (the Q&A system) via an HTTP response.

## Integration Requirements
- The Sheet-to-JSON tool should remain loosely coupled from the Q&A system. During development, it will function independently.
- Once integrated, it will receive Excel files and JSON schemas from the Q&A system via HTTP requests.
- Once mapping is complete, the JSON is sent back to the Q&A system using an HTTP request.
- The tool should be flexible enough to handle both manual input during development and dynamic input when integrated.

## Technical Stack Preferences
- The front end can use a modern framework like React or Vue for ease of building interactive features (e.g., drag-and-drop and visual highlighting).
- The backend should be simple and can use something like Node.js or Python Flask to handle HTTP requests for uploading files and returning JSON.

## Summary of Interaction Flow
1. The user uploads an Excel sheet to the Sheet-to-JSON tool.
2. The tool displays the sheet and attempts to auto-map fields to a provided JSON schema.
3. Users visually adjust the mappings if needed by dragging and dropping highlights to the correct cells.
4. Once mapping is complete, the user clicks a “Complete” button.
5. The tool converts the mappings into a JSON document and sends it back to the Q&A system using an HTTP request.

## Key Design Principles
- Flexibility: The Sheet-to-JSON tool must operate independently during development but easily integrate later.
- Visual UI: Emphasis on a user-friendly visual interface for mapping fields.
- Loose Coupling: Integration points should be via HTTP requests to keep the systems decoupled.
