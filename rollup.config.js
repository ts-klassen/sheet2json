import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'esm',
    sourcemap: true,
    // Ensure build succeeds even when the code contains dynamic import()
    // statements by bundling everything into a single file (no code-splitting).
    inlineDynamicImports: true
  },
  plugins: [
    resolve(),
    commonjs(),
    postcss({ inject: true })
  ]
};
