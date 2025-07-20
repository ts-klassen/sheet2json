/* Entry point for Sheet-to-JSON Mapper.
 * For now this just verifies that the application bundle loads correctly.
 */

console.log('Sheet-to-JSON Mapper loaded');

// Render a simple placeholder so Cypress smoke test can assert DOM content.
const appEl = document.getElementById('app');
if (appEl) {
  const heading = document.createElement('h1');
  heading.textContent = 'Sheet-to-JSON Mapper';
  appEl.appendChild(heading);
}
