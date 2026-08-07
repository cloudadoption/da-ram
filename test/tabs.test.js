import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
// Assertions about what a module does must not read its comments.
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const tabs = strip(read('../blocks/tabs/tabs.js'));
const css = read('../blocks/tabs/tabs.css');

// The block sets a roving tabindex: 0 on the selected tab, -1 on the rest. That is the ARIA tabs
// pattern and it only works when a key moves it. From 1200 the select is display:none, so the
// strip is the only control, and measured on main--da-ram--cloudadoption at 1440 with real key
// events a keyboard reached 1 panel of 5 on en-gb and ar-sa general-terms-and-conditions:
// tabindex 0,-1,-1,-1,-1 and ArrowRight, ArrowDown and End moved nothing.
//
// Live has its own version of this and it is on the client register as
// tabControlVanishesBetween992And1199. The stylesheet closes that gap for a pointer. This closes
// it for a keyboard.
describe('the tabs strip and a keyboard', () => {
  it('moves the selection on a key', () => {
    assert.match(tabs, /keydown/);
  });

  it('handles both horizontal arrows', () => {
    assert.match(tabs, /ArrowRight/);
    assert.match(tabs, /ArrowLeft/);
  });

  it('handles Home and End', () => {
    assert.match(tabs, /\bHome\b/);
    assert.match(tabs, /\bEnd\b/);
  });

  it('moves focus with the selection, or the roving tabindex traps it on the old tab', () => {
    assert.match(tabs, /\.focus\(\)/);
  });

  it('leaves a key it does not handle to the browser', () => {
    assert.match(tabs, /preventDefault/);
  });
});

// The strip is a flex row and ar-sa computes direction rtl, so tab 1 is the rightmost: measured at
// 1440 on ar-sa/general-terms-and-conditions the five tabs start at 1074, 916, 770, 664 and 558.
// A right arrow that walks DOM order there moves the selection to the left. Home and End are not
// remapped: they mean first and last in reading order, and in RTL the last is the leftmost.
describe('the arrow keys in an RTL market', () => {
  it('reads the direction the list computes rather than the market', () => {
    assert.match(tabs, /getComputedStyle/);
    assert.match(tabs, /direction/);
    assert.doesNotMatch(tabs, /ar-sa|'ar'/);
  });

  it('swaps the horizontal arrows where the direction is rtl', () => {
    assert.match(tabs, /rtl/);
  });
});

// The roving tabindex and the select are the two halves of one control. A test that only reads the
// script would pass while the stylesheet hid both.
describe('the tabs controls', () => {
  it('keeps the select as the control below 1200', () => {
    assert.match(css, /\.tabs \.tabs-select \{[^}]*display: block/);
  });

  it('hides the select only where the list shows', () => {
    const wide = /@media \(width >= 1200px\) \{[\s\S]*?\n\}/.exec(css);
    assert.ok(wide, 'no wide-width media query');
    assert.match(wide[0], /\.tabs-list \{[^}]*display: flex/);
    assert.match(wide[0], /\.tabs-select \{[^}]*display: none/);
  });
});

// Live declares the tab strip in /o/ram-airways-theme/2025/css/styles.css, read on 2026-08-04:
//
//   .nav.nav-tabs.nav-tabs--custom
//     {display:flex;justify-content:center;align-items:flex-start;border:0}
//   .nav.nav-tabs.nav-tabs--custom li.nav-item{padding:0;margin:0}
//   ...a.nav-link{display:flex;justify-content:center;align-items:center;min-height:1.5rem;
//     padding-block:.25rem;padding-inline:.75rem;font-size:1rem;font-weight:200;
//     color:var(--ram-text-dark-color);border-block-end:.125rem solid rgba(0,0,0,0)}
//   ...a.nav-link.active{border:0;font-weight:500;
//     border-block-end:.125rem solid var(--ram-background-positive-color)}
//   @media(min-width:992px){...a.nav-link{min-height:2.1875rem;padding-inline:2.625rem}}
//
// All 30 tab pages on live are legacy-theme, so their rendered values come from a stylesheet
// decision 0025 discards and the 2025 declaration is the requirement. That is L-231.
//
// What we drew instead: a 1px #e0e0e0 rule across the whole column where live declares border 0,
// the strip left-packed where live centres it, 15.75px at weight 300 rising to 700 where live
// declares 1rem at 200 rising to 500, and the marker in #c20831 where live names its own
// positive-background token, #a22032. The #e0e0e0 came from var(--ram-border-color, #e0e0e0), and
// this repository defines no such token.
describe('the tab strip follows the 2025 theme', () => {
  const styles = readFileSync(new URL('../blocks/tabs/tabs.css', import.meta.url), 'utf8');
  const rootStyles = readFileSync(new URL('../styles/styles.css', import.meta.url), 'utf8');
  const declared = styles.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector) => {
    const at = declared.indexOf(selector);
    assert.ok(at >= 0, `expected a rule for ${selector}`);
    return declared.slice(at, declared.indexOf('}', at) + 1);
  };

  it('draws no rule under the strip, because live declares border 0', () => {
    assert.doesNotMatch(declared, /border-bottom:\s*1px solid var\(--ram-border-color/);
    assert.doesNotMatch(declared, /--ram-border-color/);
  });

  // The strip is flex only from 1200, where the select gives way to it, so it centres there.
  it('centres the strip', () => {
    const wide = /@media \(width >= 1200px\) \{[\s\S]*?\n\}/.exec(declared);
    assert.ok(wide, 'expected the 1200px rule');
    assert.match(wide[0], /justify-content:\s*center/);
    assert.match(wide[0], /border:\s*0/);
  });

  it('takes the declared type', () => {
    const tab = rule('.tabs .tabs-tab {');
    assert.match(tab, /font-size:\s*16px/);
    assert.match(tab, /font-weight:\s*200/);
    assert.doesNotMatch(tab, /15\.75px/);
  });

  it('takes the declared selected weight and the client-s own marker token', () => {
    const selected = rule(".tabs .tabs-tab[aria-selected='true'] {");
    assert.match(selected, /font-weight:\s*500/);
    assert.match(selected, /border-bottom-color:\s*var\(--ram-background-positive-color\)/);
    assert.match(rootStyles, /--ram-background-positive-color:\s*#a22032/);
  });

  it('takes the declared padding and its 992 step', () => {
    assert.match(rule('.tabs .tabs-tab {'), /padding:\s*4px 12px/);
    const step = /@media \(width >= 992px\) \{[\s\S]*?\n\}/.exec(declared);
    assert.ok(step, 'expected a 992px step, where live steps');
    assert.match(step[0], /padding-inline:\s*42px/);
  });
});

// A role="tab" without aria-controls and a role="tabpanel" without aria-labelledby leave the two
// unassociated. A screen reader announces "tab, 1 of 5, selected" and cannot say which panel it
// opens, and a reader who lands in the panel is not told which tab brought them there. The rest of
// the pattern is here already: tablist, tab, tabpanel, aria-selected and a roving tabindex.
describe('the tab and its panel are associated', () => {
  it('gives each tab an aria-controls', () => {
    assert.match(tabs, /setAttribute\('aria-controls'/);
  });

  it('gives each panel an aria-labelledby', () => {
    assert.match(tabs, /setAttribute\('aria-labelledby'/);
  });

  it('gives each tab and each panel an id, because the two attributes name one', () => {
    assert.match(tabs, /\bid\s*=/);
  });

  // Two tabs blocks on one page would otherwise both call their first panel tabs-panel-0, and an
  // aria-controls would resolve to the wrong one.
  it('counts the blocks, so a second one on a page gets its own ids', () => {
    assert.match(tabs, /let\s+\w*[Bb]lock\w*\s*=\s*0|blocks\s*\+=\s*1|\+\+\s*blocks/);
  });
});
