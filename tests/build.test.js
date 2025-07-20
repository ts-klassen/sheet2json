import { execSync } from 'child_process';
import fs from 'fs';

describe('build script', () => {
  test('produces dist/bundle.js and index.html', () => {
    execSync('npm run build', { stdio: 'ignore' });
    expect(fs.existsSync('dist/bundle.js')).toBe(true);
    const html = fs.readFileSync('dist/index.html', 'utf8');
    expect(html).toContain('bundle.js');
  }, 30000);
});
