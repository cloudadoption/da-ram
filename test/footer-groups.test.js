import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { footerGroups, markFooterBar, markFooterGroups } from '../blocks/footer/footer-groups.js';

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

// Below the three collapsible columns live carries a bar of three links, always
// visible. It reaches the document as a list with no heading over it, so
// markFooterGroups leaves it alone and it needs a class of its own to be laid
// out as a row rather than stacked.
describe('markFooterBar', () => {
  const withChildren = (tag, kids) => {
    const el = element(tag);
    el.children = kids;
    return el;
  };

  it('marks a list with no heading over it', () => {
    const ul = element('UL');
    const wrapper = withChildren('DIV', [withChildren('DIV', [ul])]);
    assert.equal(markFooterBar(wrapper), 1);
    assert.ok(ul.classList.contains('footer-bar-list'));
  });

  it('leaves a list a heading already claimed alone', () => {
    const h = element('H2', 'About us');
    const ul = element('UL');
    const wrapper = withChildren('DIV', [h, ul]);
    markFooterGroups(wrapper);
    assert.equal(markFooterBar(wrapper), 0);
    assert.ok(!ul.classList.contains('footer-bar-list'));
  });

  it('marks the bar and skips the three groups in one footer', () => {
    const groups = [0, 1, 2].map(() => withChildren('DIV', [element('H2', 'x'), element('UL')]));
    const bar = element('UL');
    const wrapper = withChildren('DIV', [...groups, withChildren('DIV', [bar])]);
    markFooterGroups(wrapper);
    assert.equal(markFooterBar(wrapper), 1);
    assert.ok(bar.classList.contains('footer-bar-list'));
  });

  it('does not mark the same list twice', () => {
    const ul = element('UL');
    const wrapper = withChildren('DIV', [withChildren('DIV', [ul])]);
    markFooterBar(wrapper);
    assert.equal(markFooterBar(wrapper), 0);
  });

  it('finds no bar in a footer that is groups only', () => {
    const wrapper = withChildren('DIV', [element('H2', 'A'), element('UL')]);
    markFooterGroups(wrapper);
    assert.equal(markFooterBar(wrapper), 0);
  });

  // A 60-link Destinations column styled as a horizontal bar is a worse
  // regression than the missing bar was, so the two passes do not depend on
  // which ran first.
  it('skips a group list even when markFooterGroups has not run', () => {
    const wrapper = withChildren('DIV', [element('H2', 'About us'), element('UL')]);
    assert.equal(markFooterBar(wrapper), 0);
  });

  it('leaves a list nested inside a list item alone', () => {
    const inner = element('UL');
    const item = withChildren('LI', [inner]);
    const outer = withChildren('UL', [item]);
    const wrapper = withChildren('DIV', [outer]);
    markFooterBar(wrapper);
    assert.ok(outer.classList.contains('footer-bar-list'));
    assert.ok(!inner.classList.contains('footer-bar-list'));
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

// The shape of the footer documents actually in DA, verified rendering in all ten markets on
// 2026-08-02: four sections, three of them a heading and its list, and the bar as a list alone.
// Each column is its own section, so the marking has to reach through a level rather than read the
// footer's own children. Live's three columns are About us, Destinations and Help; the Destinations
// links are absolute URLs onto the live flight estate and resolve, so pruneFooter keeps them.
describe('the footer documents in DA', () => {
  const section = (kids) => {
    const wrapper = element('DIV');
    wrapper.children = kids;
    return wrapper;
  };
  const authored = () => {
    const columns = ['About us', 'Destinations', 'Help']
      .map((heading) => ({ title: element('H2', heading), list: element('UL') }));
    const bar = element('UL');
    const footer = {
      children: [
        ...columns.map(({ title, list }) => section([title, list])),
        section([bar]),
      ],
    };
    return { footer, columns, bar };
  };

  it('marks all three columns, one section deep', () => {
    const { footer, columns } = authored();
    assert.equal(markFooterGroups(footer), 3);
    columns.forEach(({ title, list }) => {
      assert.ok(title.classList.contains('footer-group-title'));
      assert.ok(list.classList.contains('footer-group-list'));
    });
  });

  it('closes each column, because live opens on a click', () => {
    const { footer, columns } = authored();
    markFooterGroups(footer);
    columns.forEach(({ title, list }) => {
      assert.equal(title.getAttribute('aria-expanded'), 'false');
      assert.equal(list.style.display, 'none');
    });
  });

  it('claims the bar and none of the column lists', () => {
    const { footer, columns, bar } = authored();
    markFooterGroups(footer);
    assert.equal(markFooterBar(footer), 1);
    assert.ok(bar.classList.contains('footer-bar-list'));
    columns.forEach(({ list }) => assert.ok(!list.classList.contains('footer-bar-list')));
  });

  it('claims the bar the same way when it runs before markFooterGroups', () => {
    const { footer, columns, bar } = authored();
    assert.equal(markFooterBar(footer), 1);
    assert.ok(bar.classList.contains('footer-bar-list'));
    columns.forEach(({ list }) => assert.ok(!list.classList.contains('footer-bar-list')));
  });
});
