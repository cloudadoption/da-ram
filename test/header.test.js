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
