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
    style: { display: '' },
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

// The footer block moves the fragment's section divs into a wrapper, so the
// headings sit one level below the element the block hands over. Marking only
// the wrapper's own children found nothing and the footer shipped expanded.
describe('markFooterGroups on the shape the block actually passes', () => {
  const withChildren = (tag, kids) => {
    const el = element(tag);
    el.children = kids;
    return el;
  };

  it('marks a group nested in a section div', () => {
    const h = element('H2', 'About us');
    const ul = element('UL');
    const section = withChildren('DIV', [h, ul]);
    const wrapper = withChildren('DIV', [section]);
    assert.equal(markFooterGroups(wrapper), 1);
    assert.ok(h.classList.contains('footer-group-title'));
  });

  it('marks groups across several sections', () => {
    const pairs = [['A', 'B'], ['C', 'D']].map(() => {
      const h = element('H2', 'x');
      return { h, section: withChildren('DIV', [h, element('UL')]) };
    });
    const wrapper = withChildren('DIV', pairs.map((p) => p.section));
    assert.equal(markFooterGroups(wrapper), 2);
  });

  it('still marks a group that is a direct child', () => {
    const h = element('H2', 'About us');
    const wrapper = withChildren('DIV', [h, element('UL')]);
    assert.equal(markFooterGroups(wrapper), 1);
  });

  // The real tree is footer > .footer.block > wrapper > .section >
  // .default-content-wrapper > h2, so a fixed depth is the wrong shape to code
  // against. Marking one level down still found nothing and it shipped expanded.
  it('marks a group three levels down, which is where the block puts it', () => {
    const h = element('H2', 'About us');
    const inner = withChildren('DIV', [h, element('UL')]);
    const section = withChildren('DIV', [inner]);
    const wrapper = withChildren('DIV', [section]);
    assert.equal(markFooterGroups(wrapper), 1);
    assert.ok(h.classList.contains('footer-group-title'));
  });

  it('does not mark the same heading twice when it nests', () => {
    const h = element('H2', 'About us');
    const section = withChildren('DIV', [h, element('UL')]);
    const wrapper = withChildren('DIV', [section]);
    markFooterGroups(wrapper);
    assert.equal(h.attrs.role, 'button');
    assert.equal(markFooterGroups(wrapper), 0);
  });
});

// The block's CSS arrives after the footer markup, so a group collapsed by a
// class alone paints open and then shuts: CLS went from 0 to 0.232 on mobile.
// Setting the display inline needs no stylesheet, so the first paint is already
// closed.
describe('the group is closed before anything is painted', () => {
  const withChildren = (tag, kids) => {
    const el = element(tag);
    el.children = kids;
    return el;
  };

  it('hides the list without waiting for a stylesheet', () => {
    const h = element('H2', 'About us');
    const ul = element('UL');
    markFooterGroups(withChildren('DIV', [h, ul]));
    assert.equal(ul.style.display, 'none');
  });

  it('hands the display back to the stylesheet when the group opens', () => {
    const h = element('H2', 'About us');
    const ul = element('UL');
    markFooterGroups(withChildren('DIV', [h, ul]));
    h.fire('click');
    assert.equal(ul.style.display, '');
  });

  it('hides it again on the second click', () => {
    const h = element('H2', 'About us');
    const ul = element('UL');
    markFooterGroups(withChildren('DIV', [h, ul]));
    h.fire('click');
    h.fire('click');
    assert.equal(ul.style.display, 'none');
  });
});
