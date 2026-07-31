import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const cards = readFileSync(new URL('../blocks/cards/cards.css', import.meta.url), 'utf8');
// Assertions about what the file declares must not read its comments.
const declarations = cards.replace(/\/\*[\s\S]*?\*\//g, '');

// Measured on live at 375, 768, 992, 1200, 1280, 1360 and 1440 on
// /en-gb/preparing-your-trip, and confirmed at 1440 on checked-baggage in three
// languages and information/check-in-conditions: one column below 992, two from
// 992 and three from 1280. The 1280 is the same breakpoint the content column
// caps at. The boilerplate laid the cards out with auto-fill, which gives four.
describe('the cards grid', () => {
  const list = /\.cards > ul \{[\s\S]*?\n\}/.exec(declarations)[0];

  it('is one column below the first breakpoint', () => {
    assert.match(list, /grid-template-columns:\s*1fr;/);
  });

  it('goes to two columns at 992px', () => {
    const wide = /@media \(width >= 992px\) \{[\s\S]*?\n\s*\}\n\}/.exec(declarations);
    assert.ok(wide, 'expected a 992px block');
    assert.match(wide[0], /grid-template-columns:\s*repeat\(2, 1fr\)/);
  });

  it('goes to three columns at 1280px, where the content column also caps', () => {
    const wider = /@media \(width >= 1280px\) \{[\s\S]*?\n\s*\}\n\}/.exec(declarations);
    assert.ok(wider, 'expected a 1280px block');
    assert.match(wider[0], /grid-template-columns:\s*repeat\(3, 1fr\)/);
  });

  it('never lays the cards out by auto-fill, which gives four at 1240px', () => {
    assert.doesNotMatch(declarations, /auto-fill/);
  });

  // Live cards read `border: 0px none` on checked-baggage in three languages and
  // on preparing-your-trip. The boilerplate drew a 1px #dadada box.
  it('draws no border on a card', () => {
    const item = /\.cards > ul > li \{[\s\S]*?\n\}/.exec(declarations)[0];
    assert.doesNotMatch(item, /border:\s*1px/);
  });
});

// Live's card image is 200px tall at 768, 992, 1200 and 1440 alike, whatever the
// card width, and 157px in a 248px card at 375, which is the same proportion our
// wider mobile card reaches at 200px. The boilerplate forced 4/3, which at a
// 397px card is 298px tall and made the card 676px against live's 456px.
describe('the card image', () => {
  const rule = /\.cards > ul > li\.cards-card-photo img \{[\s\S]*?\n\}/.exec(declarations)[0];

  it('is the measured 200px tall', () => {
    assert.match(rule, /height:\s*200px/);
  });

  it('does not force an aspect ratio, which fought the height', () => {
    assert.doesNotMatch(rule, /aspect-ratio/);
  });

  it('still covers its box', () => {
    assert.match(rule, /object-fit:\s*cover/);
  });
});

// The icon class lands when the image loads, which is after the first paint.
// Sizing the card from it moved the layout under the reader: 0.1432 of a 0.1591
// CLS on checked-baggage, against 0.0088 on a page with no cards. object-fit is
// a paint property, so switching it moves nothing.
describe('the icon card is the default, so nothing moves for it', () => {
  const base = /\.cards > ul > li img \{[\s\S]*?\n\}/.exec(declarations)[0];

  it('lets an icon keep its own size with no class at all', () => {
    assert.match(base, /height:\s*auto/);
    assert.match(base, /max-width:\s*100%/);
    assert.doesNotMatch(base, /[^-]width:\s*100%/);
  });

  it('has no icon class left to add', () => {
    assert.doesNotMatch(declarations, /cards-card-icon/);
  });
});
