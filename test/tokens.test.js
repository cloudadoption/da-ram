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

  // Superseded by the measurement below: live keeps the link colour on hover and the dark
  // brand token is its active colour.
  it('leaves no boilerplate blue in the link hover', () => {
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

// The hover value was the one token in styles.css taken from a name rather than measured. The
// comment said a hover state cannot be read from a headless computed style. It can be read from
// the client's own stylesheet, /o/ram-airways-theme/2025/css/styles.css, fetched 2026-08-04.
//
// Live declares `body a:hover { color: var(--ram-text-primary-color) }`, which is #c20831 and
// the link colour. Live does not change a link's colour on hover, and ours went to #8d2b61.
//
// The dark brand variant is live's ACTIVE colour, not its hover. On the primary button:
//   .ram-btn-f1               background-color: var(--ram-brand-primary-color)       #c20831
//   .ram-btn-f1:hover,:focus  background: var(--ram-background-positive-color)       #a22032
//   .ram-btn-f1:active        background: var(--ram-brand-primary-dark-color)        #8d2b61
// Our accent button matches at rest and took the dark variant for hover, a state too far.
describe('the hover and active colours, measured on live', () => {
  // Assertions about what the file declares must not read its comments.
  const declared = styles.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const found = new RegExp(`(?:^|\\n)${escaped}[^{]*\\{[\\s\\S]*?\\n\\}`).exec(declared);
    assert.ok(found, `expected a rule for ${selector}`);
    return found[0];
  };

  it('leaves a link its own colour on hover, which is what live does', () => {
    assert.match(declared, /--link-hover-color:\s*var\(--link-color\)/);
  });

  // Live declares `body a:hover { text-decoration: none; color: var(--ram-text-primary-color) }`,
  // so it takes the underline off the hover as well as off the rest. The boilerplate underlines on
  // hover and that was left behind when the colour was corrected. Decision 0023 reproduces live
  // including where it is poor, and the cost is on the client register: the link colour #c20831
  // against body text #1a1717 is 2.86:1, under the 3:1 WCAG 1.4.1 asks for where colour is the
  // only distinguisher, with no underline to carry it.
  it('takes the underline off the hover, which is what live declares', () => {
    assert.doesNotMatch(rule('a:hover'), /text-decoration:\s*underline/);
  });

  it('gives the accent button live’s hover background', () => {
    assert.match(rule('a.button.accent:hover'), /var\(--ram-background-positive-color\)/);
  });

  it('gives the accent button live’s active background, the dark brand variant', () => {
    const active = rule('a.button.accent:active');
    assert.match(active, /var\(--ram-brand-primary-dark-color\)/);
  });

  it('keeps the accent button’s rest background, which already matched live', () => {
    assert.match(rule('a.button.accent'), /background-color:\s*var\(--link-color\)/);
  });
});

// The header height was the boilerplate's 64px, flat at every width. Live carries two heights and
// the step is at 768, measured in a browser on /en-gb/checked-baggage on 2026-08-04:
//
//            live 1440   live 375   ours before
//   height      80px       48px       64px
//   min-height  80px        0px        0px
//   position   sticky     sticky     static
//
// The 80px comes from .header__logo__img{height:5rem} and .header__container{max-height:fit-content},
// both gated at 768, which is what 0.1 of the design spec corrected from an earlier reading of 992.
// The spec's section 3.4 named the token change and it had not been made.
describe('the header height, measured on live', () => {
  const declared = styles.replace(/\/\*[\s\S]*?\*\//g, '');

  it('starts at live’s narrow height', () => {
    assert.match(declared, /--nav-height:\s*48px/);
  });

  it('steps to live’s wide height at 768, where live steps', () => {
    const found = /@media\s*\(width\s*>=\s*768px\)\s*\{[\s\S]*?\n\}/.exec(declared);
    assert.ok(found, 'expected a 768px media query');
    assert.match(found[0], /--nav-height:\s*80px/);
  });

  it('no longer carries the boilerplate 64px', () => {
    assert.doesNotMatch(declared, /--nav-height:\s*64px/);
  });
});
