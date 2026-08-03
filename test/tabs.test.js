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
    assert.match(tabs, /'Home'/);
    assert.match(tabs, /'End'/);
  });

  it('moves focus with the selection, or the roving tabindex traps it on the old tab', () => {
    assert.match(tabs, /\.focus\(\)/);
  });

  it('leaves a key it does not handle to the browser', () => {
    assert.match(tabs, /preventDefault/);
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
