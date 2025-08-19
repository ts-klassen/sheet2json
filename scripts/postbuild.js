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

// Copy i18n YAML catalog
const i18nSrc = path.join('src', 'i18n', 'messages.yaml');
const i18nDstDir = path.join('dist', 'i18n');
try {
  fs.mkdirSync(i18nDstDir, { recursive: true });
  fs.copyFileSync(i18nSrc, path.join(i18nDstDir, 'messages.yaml'));
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('i18n catalog copy skipped:', err && err.message);
}
