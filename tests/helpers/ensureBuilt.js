import fs from 'fs';
import { execSync } from 'child_process';

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function ensureBuilt({ timeoutMs = 30000 } = {}) {
  if (fs.existsSync('dist/bundle.js') && fs.existsSync('dist/index.html')) return;

  fs.mkdirSync('.tmp', { recursive: true });
  const lockPath = '.tmp/jest-build.lock';

  let hasLock = false;
  try {
    const fd = fs.openSync(lockPath, 'wx');
    fs.closeSync(fd);
    hasLock = true;

    execSync('npm run build', { stdio: 'ignore' });
  } catch (err) {
    if (err && err.code === 'EEXIST') {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (fs.existsSync('dist/bundle.js') && fs.existsSync('dist/index.html')) return;
        sleep(50);
      }
      throw new Error('Timed out waiting for build artifacts');
    }
    throw err;
  } finally {
    if (hasLock) {
      try {
        fs.unlinkSync(lockPath);
      } catch (_) {
        // ignore
      }
    }
  }

  if (!fs.existsSync('dist/bundle.js') || !fs.existsSync('dist/index.html')) {
    throw new Error('Build did not produce dist artifacts');
  }
}

