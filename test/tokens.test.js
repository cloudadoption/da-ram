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

// Live's section heading is the modal h3 on the page and it does not agree with
// itself across templates. Over 30 templates on the 2025 theme, measured at 1440:
// 16 read 28px, which is our value, then 24px on 4, 32px on 3, 20.8px on 2 and six
// singletons. Decision 0024 carries the commonest three and aligns the tail, so
// 28px stays the default and 24 and 32 ride in `theme` metadata, which
// decorateTemplateAndTheme splits on comma so a page can carry a heading colour too.
describe('the section heading size a page can carry', () => {
  const declarations = styles.replace(/\/\*[\s\S]*?\*\//g, '');

  it('keeps 28px as the default, which 16 of 30 templates read', () => {
    const rule = /(?:^|\n)h3 \{[\s\S]*?\n\}/.exec(declarations);
    assert.ok(rule, 'expected an h3 rule');
    assert.match(rule[0], /--heading-font-size-l/);
  });

  it('carries live\'s 24px as a body class', () => {
    assert.match(declarations, /body\.section-heading-24[\s\S]*?font-size:\s*24px/);
  });

  it('carries live\'s 32px as a body class', () => {
    assert.match(declarations, /body\.section-heading-32[\s\S]*?font-size:\s*32px/);
  });

  it('names no third variant, because the vocabulary is three counting the default', () => {
    const variants = [...declarations.matchAll(/body\.section-heading-(\d+)/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(variants)].sort(), ['24', '32']);
  });

  it('scopes the override to the section heading, not to every h3 on the page', () => {
    assert.match(declarations, /body\.section-heading-24 main h3/);
  });
});
