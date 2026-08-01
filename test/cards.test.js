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

// Live gives the icon a fixed height and lets the width follow: 24px below 992
// and 36px from 992, measured at 375, 412, 600, 720, 768, 860, 900, 960, 992,
// 1024, 1200, 1280 and 1440 on checked-baggage. The card is 60px then 110px.
// height: auto rendered each icon at its natural 59 to 80px and made the card
// 156px at every width, which is 96px added per card at mobile.
//
// A height in the stylesheet also reserves the space, so nothing moves when the
// image arrives. An earlier attempt sized the card from a class added on load and
// shifted the layout under the reader: 0.1432 of a 0.1591 CLS on
// checked-baggage. There is no class here and no JS.
describe('the icon card is the default, so nothing moves for it', () => {
  // The 992px block declares the same selector, indented, and comes first in the
  // file, so anchor on the rule that starts at column 0.
  const base = /^\.cards > ul > li img \{[\s\S]*?\n\}/m.exec(declarations)[0];

  it('takes live\'s measured 24px height below the breakpoint', () => {
    assert.match(base, /height:\s*24px/);
  });

  it('lets the width follow the aspect ratio', () => {
    assert.match(base, /width:\s*auto/);
    assert.match(base, /max-width:\s*100%/);
    assert.doesNotMatch(base, /[^-]width:\s*100%/);
  });

  it('reserves the height rather than growing on load', () => {
    assert.doesNotMatch(base, /height:\s*auto/);
  });

  // The 36px has to be declared after the 24px, not in the grid's 992px block
  // near the top: same specificity, so the later declaration wins.
  it('goes to live\'s 36px at 992px', () => {
    const blocks = [...declarations.matchAll(/@media \(width >= 992px\) \{[\s\S]*?\n\s*\}\n\}/g)];
    const withIcon = blocks.filter((b) => /\.cards > ul > li img \{[^}]*height:\s*36px/.test(b[0]));
    assert.equal(withIcon.length, 1, 'expected one 992px block sizing the icon');
    assert.ok(
      declarations.indexOf(withIcon[0][0]) > declarations.search(/^\.cards > ul > li img \{/m),
      'the 36px must come after the 24px or it is overridden',
    );
  });

  it('has no icon class left to add', () => {
    assert.doesNotMatch(declarations, /cards-card-icon/);
  });
});
