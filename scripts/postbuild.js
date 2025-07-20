import fs from 'fs';
import path from 'path';

const srcHtml = fs.readFileSync('index.html', 'utf8');

// Replace module script with bundled file reference
const patched = srcHtml.replace("src/main.js", "bundle.js").replace(
  '<link rel="stylesheet" href="styles/styles.css" />',
  ''
);

// Ensure dist directory exists
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync(path.join('dist', 'index.html'), patched);
