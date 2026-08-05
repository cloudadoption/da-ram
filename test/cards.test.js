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

// Live's cover card image is 200px tall at 768, 992, 1200 and 1440 alike, whatever
// the card width, and 157px in a 248px card at 375, which is the same proportion our
// wider mobile card reaches at 200px. The boilerplate forced 4/3, which at a
// 397px card is 298px tall and made the card 676px against live's 456px.
//
// Only the cover card. A photo in an ordinary card keeps its own proportions, because
// 64 of the 1,066 blocks holding an image are link-card and the other 1,002 are not,
// and cropping the rest to 200px would cut images live shows whole.
describe('the cover card image', () => {
  const rule = /\.cards\.cover > ul > li\.cards-card-photo img \{[\s\S]*?\n\}/.exec(declarations)[0];

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

describe('the photo card image outside a cover block', () => {
  const rule = /^\.cards > ul > li\.cards-card-photo img \{[\s\S]*?\n\}/m.exec(declarations)[0];

  it('keeps its own proportions rather than a fixed height', () => {
    assert.match(rule, /height:\s*auto/);
    assert.doesNotMatch(rule, /height:\s*200px/);
  });

  it('never overflows its card', () => {
    assert.match(rule, /max-width:\s*100%/);
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

  // The icon height used to apply to every card image, so the stylesheet named no
  // class and nothing ran on load. The cover variant needed the two apart, so the
  // class is back. What matters is when it lands: markStatedCards reads the width the
  // transform wrote into the document, before createOptimizedPicture drops it and
  // before the image loads, so the card is sized on the first paint and CLS reads
  // 0.0000. The earlier attempt decided from the loaded image and shifted the layout
  // under the reader.
  it('sizes the icon card from a class the stylesheet declares', () => {
    assert.match(declarations, /\.cards > ul > li\.cards-card-icon/);
  });

  it('does not wait for the image to decide, so nothing moves', () => {
    const js = readFileSync(new URL('../blocks/cards/card-icons.js', import.meta.url), 'utf8');
    assert.match(js, /getAttribute\('width'\)/, 'it reads the authored width');
    const decorator = readFileSync(new URL('../blocks/cards/cards.js', import.meta.url), 'utf8');
    assert.ok(
      decorator.indexOf('markStatedCards') < decorator.indexOf('createOptimizedPicture(img.src'),
      'the width has to be read before createOptimizedPicture drops it',
    );
  });
});

// Live declares the card title's colour, in /o/ram-airways-theme/2025/css/styles.css:
//
//   .small-card__title{width:100%;color:var(--ram-text-dark-color)}
//   .card-full__title{width:100%;color:var(--ram-text-dark-color)}
//
// Measured over eight en-GB card pages at 1440: small-card reads #1a1717 on 11 titles, baggage-card
// #000 on 4, ram-card #333 on 3, ram-header-card #634959 on 1, and link-card the brand red #c20831
// on 3. So 19 of 23 are a dark colour and the link-card is the exception, which is the same split
// the type scale already makes. Ours drew the brand red on each, because the title is an anchor and
// takes --link-color.
describe('the card title colour', () => {
  const styles = readFileSync(new URL('../blocks/cards/cards.css', import.meta.url), 'utf8');
  const rootStyles = readFileSync(new URL('../styles/styles.css', import.meta.url), 'utf8');
  const declared = styles.replace(/\/\*[\s\S]*?\*\//g, '');

  it('is the client-s dark token on a card', () => {
    const rule = /\.cards:not\(\.cover\) > ul > li [^{]*a[^{]*\{[\s\S]*?\n\}/.exec(declared);
    assert.ok(rule, 'expected a title colour rule for a card');
    assert.match(rule[0], /color:\s*var\(--ram-text-dark-color\)/);
    assert.match(rootStyles, /--ram-text-dark-color:\s*#1a1717/);
  });

  // A cover block's cards are photo cards, so scoping the rule to the icon and photo card let it
  // through there: six titles on /en-gb/add-extra-luggage went dark against live's red.
  it('leaves the link-card on the brand red, which is what live draws', () => {
    assert.doesNotMatch(declared, /\.cards\.cover[^{]*a[^{]*\{[^}]*color:/);
    assert.match(declared, /\.cards:not\(\.cover\)/);
  });
});

// Live puts a chevron at the card's trailing edge, on the title's line: i.small-card__arrow at
// font-size 24px in the brand red, a 25x24 box 16px from the card's trailing edge. Measured on
// /en-gb/checked-baggage, /en-gb/baggage-information and /en-gb/add-extra-luggage, same on each.
//
// 18 of the 23 card titles read across eight en-GB pages carry one: small-card 11, baggage-card 4
// and link-card 3. The 5 without are ram-card and ram-header-card, the cards with no image, so
// the chevron follows the same icon-and-photo split the type sizes make.
//
// The glyph is from the client's ram-icons font and this repository does not load it, so it is
// drawn: an 8px square with two 2px edges, turned 45deg.
describe('the card chevron', () => {
  const styles = readFileSync(new URL('../blocks/cards/cards.css', import.meta.url), 'utf8');
  const declared = styles.replace(/\/\*[\s\S]*?\*\//g, '');
  const CARD = '\\.cards > ul > li:is\\(\\.cards-card-icon, \\.cards-card-photo\\)';
  const marker = () => {
    const found = new RegExp(`${CARD}[^{]*::after \\{[\\s\\S]*?\\n\\}`).exec(declared);
    assert.ok(found, 'expected a chevron rule for the icon and photo card');
    return found[0];
  };

  it('draws it in the brand red, as live does', () => {
    assert.match(marker(), /var\(--link-color\)/);
  });

  it('puts it at the trailing edge of the title row', () => {
    assert.match(marker(), /margin-inline-start:\s*auto/);
    const row = /\.cards > ul > li :is\(h1, h2, h3, h4, h5, h6\) \{[\s\S]*?\n\}/
      .exec(declared);
    assert.ok(row, 'expected a rule for the title row');
    assert.match(row[0], /display:\s*flex/);
  });

  // A chevron on a card that links nowhere says the reader can go somewhere.
  it('only draws it where the title holds a link', () => {
    assert.match(declared, /:has\(a\)::after/);
  });

  // transform is physical, so the reading direction needs its own angle. The logical borders move
  // on their own: border-inline-end is the left edge there, so the strokes meet at the top left
  // and the apex points up and to the left. A quarter turn anticlockwise brings it to the left.
  // 135deg took it back to pointing right, which the Arabic branch preview showed.
  it('turns it the other way in a right-to-left market', () => {
    const rtl = /\[dir="rtl"\][^{]*::after \{[\s\S]*?\n\}/.exec(declared);
    assert.ok(rtl, 'expected an rtl rule for the chevron');
    assert.match(rtl[0], /transform:\s*rotate\(-45deg\)/);
  });
});

// Live rounds a card on two opposite corners, not four. Verbatim from
// /o/ram-airways-theme/2025/css/styles.css:
//
//   .small-card{width:100%;padding:1rem;border:1.25rem 1.25rem;
//     border-start-end-radius:1.25rem;border-end-start-radius:1.25rem;
//     background-color:var(--ram-background-default-color)}
//
// So 20px on the block-start inline-end corner and the block-end inline-start one, and 0 on the
// the top left, against 0 on all four of ours. The background and the 16px padding already
// agree.
// the top left, against 0 on all four of ours. The background and the 16px padding already agree.
//
// The `border: 1.25rem 1.25rem` in live's rule is not a border at all: the shorthand wants a style,
// so the declaration is dropped and no card draws an edge. That agrees with the `border: 0px none`
// read earlier, and is why this adds no border.
//
// Logical corners, so an Arabic page rounds the top left and the bottom right instead.
describe('the card corners', () => {
  const styles = readFileSync(new URL('../blocks/cards/cards.css', import.meta.url), 'utf8');
  const declared = styles.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = () => {
    const found = /\.cards > ul > li \{[\s\S]*?\n\}/.exec(declared);
    assert.ok(found, 'expected a rule for a card');
    return found[0];
  };

  it('rounds the block-start inline-end corner by the measured 20px', () => {
    assert.match(rule(), /border-start-end-radius:\s*20px/);
  });

  it('rounds the block-end inline-start corner too', () => {
    assert.match(rule(), /border-end-start-radius:\s*20px/);
  });

  it('leaves the other two square, as live does', () => {
    assert.doesNotMatch(rule(), /border-radius:\s*20px/);
    assert.doesNotMatch(rule(), /border-start-start-radius/);
    assert.doesNotMatch(rule(), /border-end-end-radius/);
  });
});
