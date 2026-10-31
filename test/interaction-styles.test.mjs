import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';

test('interaction feedback preserves focus, reduced motion and enabled-only cursors', () => {
  const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /button:not\(:disabled\):not\(\[aria-disabled="true"\]\)/);
  assert.match(css, /cursor: not-allowed/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /:is\(:focus-visible, :active\)/);
  assert.match(css, /outline: 3px solid/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /transition: color 150ms ease/);
  assert.ok(!css.includes('transform: scale'));
});
