import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import markNavGroups from '../blocks/header/nav-groups.js';

// A list item stands in for an li. `sub` is its nested list, if it has one.
const item = (sub = null) => {
  const classes = new Set();
  return {
    classList: { add: (c) => classes.add(c), contains: (c) => classes.has(c) },
    querySelector: (selector) => (selector === ':scope > ul' ? sub : null),
    children: sub ? [sub] : [],
    classes,
  };
};
const list = (items) => ({ children: items });

describe('markNavGroups', () => {
  // RAM's live nav is three levels: top item, group heading, link. 5 top items, 14
  // group headings, 80 leaf links. The boilerplate styles two, so the middle level
  // needs a hook the CSS can target.
  it('marks a second level item that holds its own list', () => {
    const leaf = item();
    const group = item(list([leaf]));
    const top = item(list([group]));
    markNavGroups(list([top]));
    assert.equal(group.classList.contains('nav-group'), true);
    assert.equal(leaf.classList.contains('nav-group'), false);
  });

  it('leaves a second level item with no list of its own alone', () => {
    const plain = item();
    const top = item(list([plain]));
    markNavGroups(list([top]));
    assert.equal(plain.classList.contains('nav-group'), false);
  });

  it('does not mark the top level, which already has nav-drop', () => {
    const group = item(list([item()]));
    const top = item(list([group]));
    markNavGroups(list([top]));
    assert.equal(top.classList.contains('nav-group'), false);
  });

  it('reports the deepest level it found, so a nav deeper than three is visible', () => {
    const shallow = list([item(list([item()]))]);
    assert.equal(markNavGroups(shallow), 2);
    const three = list([item(list([item(list([item()]))]))]);
    assert.equal(markNavGroups(three), 3);
  });

  it('handles a nav with no nesting at all', () => {
    assert.equal(markNavGroups(list([item(), item()])), 1);
  });

  it('handles an absent list', () => {
    assert.equal(markNavGroups(null), 0);
  });
});

// Live's header carries the brand mark, not the words. The migrated header
// showed the text "Royal Air Maroc". The SVG is 65x48 up to 700px wide and
// 108x80 from 768, measured at 375, 480, 576, 600, 700, 768, 992, 1200 and 1440.
// It is served from the live origin, as the fonts already are, until cutover.
describe('the header brand mark', () => {
  const styles = readFileSync(new URL('../blocks/header/header.css', import.meta.url), 'utf8');
  const declarations = styles.replace(/\/\*[\s\S]*?\*\//g, '');
  const brand = /\.nav-brand a:any-link \{[\s\S]*?\n\}/.exec(declarations);

  it('shows the logo the live theme serves', () => {
    assert.ok(brand, 'expected a rule for the brand link');
    assert.match(brand[0], /url\('https:\/\/www\.royalairmaroc\.com\/o\/ram-airways-theme\/2025\/assets\/images\/logo_ram\.svg'\)/);
  });

  it('takes the measured 65x48 below the breakpoint', () => {
    assert.match(brand[0], /width:\s*65px/);
    assert.match(brand[0], /height:\s*48px/);
  });

  it('grows to the measured 108x80 at 768', () => {
    const blocks = declarations.match(/@media \(width >= 768px\) \{[\s\S]*?\n\s*\}\n\}/g) || [];
    const wide = blocks.find((b) => b.includes('.nav-brand'));
    assert.ok(wide, 'expected a 768px block for the brand');
    assert.match(wide, /width:\s*108px/);
    assert.match(wide, /height:\s*80px/);
  });

  it('keeps the words for a screen reader rather than dropping them', () => {
    assert.match(brand[0], /(text-indent|font-size:\s*0|overflow:\s*hidden)/);
  });
});

// The nav bar switches at 1280 on live, not at 900. Measured in a browser on
// /en-gb/checked-baggage at 375, 900, 1024, 1279, 1280 and 1440 on 2026-08-04: live shows the
// hamburger from 375 through 1279 and the desktop bar from 1280, and ours showed the desktop bar
// from 900. So between 900 and 1279, 380px of viewport, the header was structurally different.
//
// 0.1 of the design spec corrected an earlier reading of 992 to this, and section 3.4 named the
// change under what has to change in blocks/header: "change it to 1280, because the nav bar
// switches there, not at 900 and not at 768".
//
// The 900 in scripts.js is a different thing, the eager font-loading threshold, and stays.
describe('the nav bar breakpoint', () => {
  const css = readFileSync(new URL('../blocks/header/header.css', import.meta.url), 'utf8');
  const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const js = readFileSync(new URL('../blocks/header/header.js', import.meta.url), 'utf8');

  it('gates the desktop layout at 1280 in the stylesheet', () => {
    assert.doesNotMatch(declarations, /@media\s*\(width\s*>=\s*900px\)/);
    assert.match(declarations, /@media\s*\(width\s*>=\s*1280px\)/);
  });

  it('hides the hamburger from 1280 and not before', () => {
    const blocks = declarations.match(/@media \(width >= 1280px\) \{[\s\S]*?\n\}/g) || [];
    assert.ok(
      blocks.some((b) => /\.nav-hamburger[\s\S]*?display:\s*none/.test(b)),
      'expected the hamburger hidden inside a 1280 block',
    );
  });

  it('shows the sections from 1280 and not before', () => {
    const blocks = declarations.match(/@media \(width >= 1280px\) \{[\s\S]*?\n\}/g) || [];
    assert.ok(
      blocks.some((b) => /\.nav-sections[\s\S]*?display:\s*block/.test(b)),
      'expected the sections shown inside a 1280 block',
    );
  });

  it('reads the same width in the module, so the JS and the CSS agree', () => {
    assert.match(js, /matchMedia\('\(min-width:\s*1280px\)'\)/);
    assert.doesNotMatch(js, /matchMedia\('\(min-width:\s*900px\)'\)/);
  });
});

// Live's header is position: sticky at every width, read on /en-gb/checked-baggage at 1440 and 375.
// Ours scrolled away from 1280 up, because the boilerplate makes .nav-wrapper fixed below the
// breakpoint and relative above it, and relative scrolls.
//
// The sticky element has to be header rather than .nav-wrapper. A sticky wrapper can only stick
// inside its containing block, and header carries height: var(--nav-height), so it would stick
// within 80px and scroll away with the page. header is a direct child of body.
//
// Tried in a browser before it was written: with header sticky, scrolling to 900 leaves the header
// at top 0, the wrapper keeps its white background and z-index 2, and elementFromPoint in the
// middle of the header band returns a UL inside the header rather than the page behind it.
describe('the header follows the page, as live’s does', () => {
  const root = readFileSync(new URL('../styles/styles.css', import.meta.url), 'utf8');
  const declared = root.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = /(?:^|\n)header \{[\s\S]*?\n\}/.exec(declared);

  it('makes the header sticky rather than static', () => {
    assert.ok(rule, 'expected a header rule in styles.css');
    assert.match(rule[0], /position:\s*sticky/);
  });

  it('pins it to the top, because sticky with no offset does not stick', () => {
    assert.match(rule[0], /top:\s*0/);
  });

  it('lifts it over the page it now scrolls under', () => {
    assert.match(rule[0], /z-index:\s*3/);
  });

  it('keeps the height that reserves the band', () => {
    assert.match(rule[0], /height:\s*var\(--nav-height\)/);
  });
});

// The hamburger is a disclosure button and aria-expanded belongs on the control a screen reader
// reads, not on the region it controls. toggleMenu set it on the nav element and swapped the
// button's aria-label, so the button announced "Open navigation, button" with no state. Read at 375
// on main: the button's aria-expanded was null closed and null open while nav's went false to true.
describe('the hamburger announces its own state', () => {
  const js = readFileSync(new URL('../blocks/header/header.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  it('gives the button an aria-expanded when it builds it', () => {
    const hamburger = /nav-hamburger[\s\S]{0,400}?`;/.exec(js);
    assert.ok(hamburger, 'expected the hamburger markup');
    assert.match(hamburger[0], /aria-expanded/);
  });

  it('sets aria-expanded on the button in toggleMenu, not only on the nav', () => {
    const toggle = /function toggleMenu\([\s\S]*?\n\}/.exec(js);
    assert.ok(toggle, 'expected toggleMenu');
    assert.match(toggle[0], /button\.setAttribute\('aria-expanded'/);
  });
});

// A nav dropdown is a focusable li with tabindex 0, a click handler, Enter and Space, and
// aria-expanded. Read from the accessibility tree at 1440 on /en-gb/checked-baggage: four of them,
// each role listitem with an empty accessible name. ARIA allows aria-expanded on a limited set of
// roles and listitem is not one, so the state rides on an element that does not take it, and the
// control a keyboard lands on announces no name at all.
//
// role="button" makes the state valid and takes the name from content, which here is the whole
// subtree: "Book Book a flight Activities ...". So the label comes from the li's own leading text,
// which the nav authors as a bare text node before the sublist.
describe('a nav dropdown names itself and takes a role its state is valid on', () => {
  const js = readFileSync(new URL('../blocks/header/header.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  it('gives a drop role button', () => {
    assert.match(js, /setAttribute\('role',\s*'button'\)/);
  });

  it('gives it an aria-label, because a button takes its name from content', () => {
    assert.match(js, /setAttribute\('aria-label'/);
  });

  it('takes the label from the leading text rather than from the whole subtree', () => {
    assert.match(js, /childNodes|firstChild/);
  });
});
