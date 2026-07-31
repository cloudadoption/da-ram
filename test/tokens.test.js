import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const styles = readFileSync(new URL('../styles/styles.css', import.meta.url), 'utf8');

// Decision 0023: complete visual parity, and use the client's own token names
// where the live theme defines them. The live theme publishes 62 custom
// properties in /o/ram-airways-theme/2025/css/styles.css, recorded in
// ram2-migration at evidence/design/live-theme-tokens.json.
//
// Each value below is agreed by two independent sources: a computed-style read
// of a live page, and the client's own declaration.
describe('brand colour tokens', () => {
  it('carries the client token names, so the theme reads as theirs', () => {
    assert.match(styles, /--ram-brand-primary-color:\s*#c20831/);
    assert.match(styles, /--ram-brand-primary-dark-color:\s*#8d2b61/);
    assert.match(styles, /--ram-text-dark-color:\s*#1a1717/);
    assert.match(styles, /--ram-text-primary-color:\s*#c20831/);
  });

  // Body text reads #1a1717 on en-gb/checked-baggage and the client declares the
  // same value as --ram-text-dark-color. The boilerplate shipped #131313.
  it('maps the boilerplate text colour onto the brand token', () => {
    assert.match(styles, /--text-color:\s*var\(--ram-text-dark-color\)/);
    assert.doesNotMatch(styles, /--text-color:\s*#131313/);
  });

  // A body link reads #c20831, which is the RAM red. The boilerplate shipped a
  // generic blue.
  it('maps the link colour onto the brand red', () => {
    assert.match(styles, /--link-color:\s*var\(--ram-text-primary-color\)/);
    assert.doesNotMatch(styles, /--link-color:\s*#3b63fb/);
  });

  it('takes the link hover from the client dark brand token', () => {
    assert.match(styles, /--link-hover-color:\s*var\(--ram-brand-primary-dark-color\)/);
    assert.doesNotMatch(styles, /--link-hover-color:\s*#1d3ecf/);
  });

  it('leaves no boilerplate blue anywhere in the stylesheet', () => {
    assert.doesNotMatch(styles, /#3b63fb|#1d3ecf/);
  });
});
