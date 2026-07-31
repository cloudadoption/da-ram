import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { footerGroups, markFooterGroups } from '../blocks/footer/footer-groups.js';

// Live's footer is 280px tall and shows 36 of its 114 links: the three link
// lists sit behind their headings and open on a click. The migrated footer
// showed all 71 of its links and ran to 1,513px, which is 1,233px added to
// every page in the estate.
const node = (tag, text = '') => ({ tagName: tag, textContent: text });

describe('footerGroups', () => {
  it('pairs a heading with the list under it', () => {
    const kids = [node('H2', 'About us'), node('UL'), node('H2', 'Help'), node('UL')];
    assert.deepEqual(footerGroups(kids), [[0, 1], [2, 3]]);
  });

  it('ignores a heading with no list under it', () => {
    const kids = [node('H2', 'About us'), node('P'), node('H2', 'Help'), node('UL')];
    assert.deepEqual(footerGroups(kids), [[2, 3]]);
  });

  it('ignores a list with no heading over it', () => {
    assert.deepEqual(footerGroups([node('UL'), node('H2', 'Help'), node('UL')]), [[1, 2]]);
  });

  it('takes a heading at any level', () => {
    assert.deepEqual(footerGroups([node('H3', 'Help'), node('UL')]), [[0, 1]]);
  });

  it('pairs an ordered list too', () => {
    assert.deepEqual(footerGroups([node('H2', 'Help'), node('OL')]), [[0, 1]]);
  });

  it('finds nothing in a footer with no lists', () => {
    assert.deepEqual(footerGroups([node('P'), node('P')]), []);
  });
});

const element = (tag, text = '') => {
  const classes = new Set();
  const attrs = {};
  return {
    tagName: tag,
    textContent: text,
    children: [],
    classList: { add: (c) => classes.add(c), contains: (c) => classes.has(c) },
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => attrs[k] ?? null,
    addEventListener: (name, fn) => { attrs[`on:${name}`] = fn; },
    fire: (name) => attrs[`on:${name}`] && attrs[`on:${name}`](),
    attrs,
    classes,
  };
};

describe('markFooterGroups', () => {
  const footerWith = (kids) => ({ children: kids });

  it('marks the heading and its list', () => {
    const h = element('H2', 'About us');
    const ul = element('UL');
    markFooterGroups(footerWith([h, ul]));
    assert.ok(h.classList.contains('footer-group-title'));
    assert.ok(ul.classList.contains('footer-group-list'));
  });

  it('closes the group, because live opens on a click', () => {
    const h = element('H2', 'About us');
    const ul = element('UL');
    markFooterGroups(footerWith([h, ul]));
    assert.equal(h.getAttribute('aria-expanded'), 'false');
  });

  it('makes the heading operable from the keyboard', () => {
    const h = element('H2', 'About us');
    markFooterGroups(footerWith([h, element('UL')]));
    assert.equal(h.getAttribute('role'), 'button');
    assert.equal(h.getAttribute('tabindex'), '0');
  });

  it('opens on a click and closes again', () => {
    const h = element('H2', 'About us');
    const ul = element('UL');
    markFooterGroups(footerWith([h, ul]));
    h.fire('click');
    assert.equal(h.getAttribute('aria-expanded'), 'true');
    h.fire('click');
    assert.equal(h.getAttribute('aria-expanded'), 'false');
  });

  it('returns how many groups it marked', () => {
    const kids = [element('H2', 'A'), element('UL'), element('H2', 'B'), element('UL')];
    assert.equal(markFooterGroups(footerWith(kids)), 2);
  });

  it('leaves a footer with no group alone', () => {
    const p = element('P', 'Copyright');
    assert.equal(markFooterGroups(footerWith([p])), 0);
    assert.ok(!p.classList.contains('footer-group-title'));
  });
});
