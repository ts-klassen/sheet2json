/**
 * Development server configuration for es-dev-server.
 *
 * This adds a small plugin that turns CSS imports (`import './foo.css';`)
 * into JS modules which inject the stylesheet into the document head.
 *
 * Without this, the browser would fetch the CSS file as text/css while
 * expecting a JavaScript module, resulting in the strict MIME type error
 * you observed.
 */

function cssToJsPlugin() {
  return {
    name: 'css-to-js',

    /**
     * Ensure the response is served with a JS mime type so that the browser
     * executes it as a module.
     */
    resolveMimeType(context) {
      if (context.path.endsWith('.css')) {
        return 'js';
      }
    },

    /**
     * Convert the CSS file into a small JS module that appends a <style>
     * element containing the original CSS to the document head. The module
     * exports the created <style> element so it can be referenced if needed.
     */
    async transform(context) {
      if (context.path.endsWith('.css')) {
        // Ensure we have string content to embed.
        const cssCode = typeof context.body === 'string' ? context.body : String(context.body);

        // Escape backticks to avoid breaking the template literal.
        const escaped = cssCode.replace(/`/g, '\\`');

        const jsModule = `
          const style = document.createElement('style');
          style.textContent = \`${escaped}\`;
          document.head.appendChild(style);
          export default style;
        `;

        return {
          body: jsModule,
          // Explicitly tell the server we're now sending JS.
          type: 'js',
        };
      }
    },
  };
}

module.exports = {
  // Resolve bare module specifiers like "lodash" to node_modules.
  nodeResolve: true,
  // Hot-reload when files change.
  watch: true,
  // Register our plugin.
  plugins: [cssToJsPlugin()],
};
