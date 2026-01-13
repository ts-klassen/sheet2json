import fs from 'fs';
import { ensureBuilt } from './helpers/ensureBuilt.js';

describe('build script', () => {
  test('produces dist/bundle.js and index.html', () => {
    ensureBuilt();
    expect(fs.existsSync('dist/bundle.js')).toBe(true);
    const html = fs.readFileSync('dist/index.html', 'utf8');
    expect(html).toContain('bundle.js');
  }, 30000);
});
