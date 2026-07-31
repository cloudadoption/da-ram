import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const cards = readFileSync(new URL('../blocks/cards/cards.css', import.meta.url), 'utf8');

// Measured on live at 375, 768, 992, 1200, 1280, 1360 and 1440 on
// /en-gb/preparing-your-trip, and confirmed at 1440 on checked-baggage in three
// languages and information/check-in-conditions: one column below 992, two from
// 992 and three from 1280. The 1280 is the same breakpoint the content column
// caps at. The boilerplate laid the cards out with auto-fill, which gives four.
describe('the cards grid', () => {
  const list = /\.cards > ul \{[\s\S]*?\n\}/.exec(cards)[0];

  it('is one column below the first breakpoint', () => {
    assert.match(list, /grid-template-columns:\s*1fr;/);
  });

  it('goes to two columns at 992px', () => {
    const wide = /@media \(width >= 992px\) \{[\s\S]*?\n\}\n\}/.exec(cards);
    assert.ok(wide, 'expected a 992px block');
    assert.match(wide[0], /grid-template-columns:\s*repeat\(2, 1fr\)/);
  });

  it('goes to three columns at 1280px, where the content column also caps', () => {
    const wider = /@media \(width >= 1280px\) \{[\s\S]*?\n\}\n\}/.exec(cards);
    assert.ok(wider, 'expected a 1280px block');
    assert.match(wider[0], /grid-template-columns:\s*repeat\(3, 1fr\)/);
  });

  it('never lays the cards out by auto-fill, which gives four at 1240px', () => {
    assert.doesNotMatch(cards, /auto-fill/);
  });

  // Live cards read `border: 0px none` on checked-baggage in three languages and
  // on preparing-your-trip. The boilerplate drew a 1px #dadada box.
  it('draws no border on a card', () => {
    const item = /\.cards > ul > li \{[\s\S]*?\n\}/.exec(cards)[0];
    assert.doesNotMatch(item, /border:\s*1px/);
  });
});
