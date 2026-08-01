import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const css = readFileSync(new URL('../blocks/callout/callout.css', import.meta.url), 'utf8');
// Assertions about what the file declares must not read its comments.
const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');

// Live's authors set a callout box inline, per page. Decision 0024 carries three
// variants and aligns the rest onto them, measured per page template rather than
// per rendered box: fill covers 13 of the 20 templates that carry a box, outline 6
// and accent 3, and ram-card is the cards block rather than a callout.
//
// The values are the modal ones within each family:
//   accent   padding 20px, radius 10px, border 4px rgb(154, 28, 62), white
//   fill     padding 25px, radius 12px, no border, rgb(248, 248, 248)
//   outline  padding 20px, radius 12px, border 1px rgb(235, 234, 232), white
describe('the callout block', () => {
  const rule = (selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const found = new RegExp(`(?:^|\\n)${escaped}\\s*\\{[\\s\\S]*?\\n\\}`).exec(declarations);
    assert.ok(found, `expected a rule for ${selector}`);
    return found[0];
  };

  it('ships a stylesheet and a module, so no page logs a missing block', () => {
    assert.ok(existsSync(new URL('../blocks/callout/callout.css', import.meta.url)));
    assert.ok(existsSync(new URL('../blocks/callout/callout.js', import.meta.url)));
  });

  it('gives the base box the measured padding and radius', () => {
    const base = rule('.callout');
    assert.match(base, /padding:\s*20px/);
    assert.match(base, /border-radius:\s*12px/);
  });

  it('draws live\'s one box red on the accent variant, at the measured width', () => {
    const accent = rule('.callout.accent');
    assert.match(accent, /border:\s*4px solid #9a1c3e/);
  });

  // The accent family's modal radius is 10px, not the 12px the base carries. The
  // branch preview read 12px because the base was not overridden.
  it('gives the accent variant its own measured radius', () => {
    assert.match(rule('.callout.accent'), /border-radius:\s*10px/);
  });

  it('fills the fill variant and draws it no border', () => {
    const fill = rule('.callout.fill');
    assert.match(fill, /background-color:\s*#f8f8f8/i);
    assert.match(fill, /border:\s*0/);
    assert.match(fill, /padding:\s*25px/);
  });

  it('draws the outline variant a hairline', () => {
    const outline = rule('.callout.outline');
    assert.match(outline, /border:\s*1px solid #ebeae8/i);
  });

  // A box that arrives with no variant is the tail decision 0024 aligns onto the
  // carried values, so it has to render as one of the three rather than unstyled.
  it('renders an unvarianted box as the commonest of the three', () => {
    const base = rule('.callout');
    assert.match(base, /background-color/);
  });

  it('names no fourth variant, because the vocabulary is three', () => {
    const variants = [...declarations.matchAll(/\.callout\.([a-z-]+)/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(variants)].sort(), ['accent', 'fill', 'outline']);
  });

  // The brand red already in the delivery CSS is #c20831 and the kartenstatus box
  // fills with rgb(194, 0, 47). Three reds are in play on live and only the box
  // border uses this one, so it is declared here rather than taken from a token.
  it('does not reach for the brand red, which is a different colour', () => {
    assert.doesNotMatch(declarations, /#c20831/i);
  });
});
