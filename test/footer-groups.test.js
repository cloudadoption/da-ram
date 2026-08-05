import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

// Live declares the footer in /o/ram-airways-theme/2025/css/styles.css, read on 2026-08-04:
//
//   .footer__link:hover{color:var(--ram-text-primary-color);text-decoration:none}
//   .footer__list__item:hover{color:var(--ram-text-primary-color);text-decoration:none}
//   .footer__webmap li{border-inline-end:1px solid var(--ram-text-inverse-color);
//     padding-inline-end:.5rem}
//   .footer__webmap li:last-child{border-inline-end:none}
//   .footer__subfooter{background-color:var(--ram-brand-primary-color);padding-inline:1rem;
//     padding-block:1rem;color:var(--ram-text-inverse-color);text-align:center}
//   html[dir=rtl] .footer__webmap li:last-child{border-inline-start:none}
//
// Measured on five 2025-theme pages at 1440 and 375, live against ours:
//   hover        live no underline and #c20831, ours underline and white
//   bottom bar   live shrink-wraps flush left at 367px with a 1px rule between items,
//                ours spans 1240px centred with no rule, 63px tall against live's 48
//   group title  live 16px on 22.4px, ours 16px on 19.2px from the shared 1.2 in styles.css
//   subfooter    live a full-bleed #c20831 band, 16px at weight 400 centred,
//                ours 12px at weight 300 on the same dark ground inside the content box
//
// The hover colour took a real mouse event to read. A JS-synthesised event does not fire CSS
// :hover, so the first reading came back white and looked like a match.
describe('the footer follows live-s own rules', () => {
  const styles = readFileSync(new URL('../blocks/footer/footer.css', import.meta.url), 'utf8');
  const rootStyles = readFileSync(new URL('../styles/styles.css', import.meta.url), 'utf8');
  const declared = styles.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector) => {
    const at = declared.indexOf(selector);
    assert.ok(at >= 0, `expected a rule for ${selector}`);
    return declared.slice(at, declared.indexOf('}', at) + 1);
  };

  it('colours a link on hover rather than underlining it', () => {
    const hover = rule('footer .footer a:hover');
    assert.match(hover, /color:\s*var\(--ram-text-primary-color\)/);
    assert.match(hover, /text-decoration:\s*none/);
    assert.doesNotMatch(hover, /text-decoration:\s*underline/);
    assert.match(rootStyles, /--ram-text-primary-color:\s*#c20831/);
  });

  it('rules the bottom bar between its items and keeps it flush', () => {
    const bar = rule('.footer-bar-list {');
    assert.match(bar, /justify-content:\s*(?:start|flex-start)/);
    assert.doesNotMatch(bar, /justify-content:\s*center/);
    const item = rule('.footer-bar-list li {');
    assert.match(item, /border-inline-end:\s*1px solid/);
    assert.match(declared, /\.footer-bar-list li:last-child \{[^}]*border-inline-end:\s*(?:none|0)/);
  });

  it('gives the group title live-s leading rather than the shared heading-s', () => {
    assert.match(rule('.footer-group-title {'), /line-height:\s*1\.4/);
  });

  // Live's group trigger, measured on /en-gb/our-fleet at 1440 and at 375. The box is the same at
  // both: padding 16px 0, no border on any edge, and 54px tall from 16 twice plus a 22.4px line.
  // Ours read 47.4px, from 12px of padding plus a 1px bottom rule at 20% white, at both widths.
  //
  // What changes at 992px is the arrangement, not the box. Live rows the three triggers, at x 100,
  // 259 and 444, all three at y 900 on a 1440 viewport, with a flat 64px between one trigger's end
  // and the next's start. Below 992px it stacks them at x 9, flush, 54px apart. Ours stacked at
  // both widths.
  //
  // Live's own divider declaration does nothing: .footer__border{border-start:1px solid ...} is not
  // a property, so it is dropped, which is why the measured border is 0 on each edge.
  it('gives the group trigger live-s box, 16px of padding and no rule', () => {
    const title = rule('.footer-group-title {');
    assert.match(title, /padding(?:-block)?:\s*16px/);
    assert.doesNotMatch(title, /border-bottom:\s*1px/);
  });

  it('rows the three triggers from 992px, where live rows them', () => {
    const wide = /@media \(width >= 992px\) \{[\s\S]*?\n\}/.exec(declared);
    assert.ok(wide, 'expected a 992px block in the footer');
    assert.match(wide[0], /display:\s*flex/);
    assert.match(wide[0], /column-gap:\s*64px/);
  });

  it('drops the bar onto its own row rather than beside a trigger', () => {
    assert.match(
      declared,
      /\.section:not\(:has\(\.footer-group-title\)\) \{[^}]*flex-basis:\s*100%/,
    );
  });

  // Live's footer box, measured on /en-gb/our-fleet at 1100 and 375. The element pads 24px 0,
  // and its column is .footer__container{width:100%;max-width:95%;margin:0 auto}, with max-width
  // 1240px from 1280px up. So the column is 95% below the cap and 1240 centred above it, and it
  // takes no inline padding of its own.
  //
  // Ours padded 0 on the element and 40px 24px 24px on the wrapper. That put the top at 40 against
  // live's 24, and the mobile column at 327px inset 24 against live's 356 inset 9. The measured
  // trigger x agrees: live 9, ours 24, at 375.
  it('pads the footer element by live-s 24px, not the wrapper by 40', () => {
    const box = rule('footer {');
    assert.match(box, /padding-block:\s*24px/);
    const column = rule('footer .footer > div {');
    assert.doesNotMatch(column, /padding:\s*40px/);
  });

  it('gives the column live-s 95% below the cap and no inline padding', () => {
    const column = rule('footer .footer > div {');
    assert.match(column, /width:\s*95%/);
    assert.match(column, /max-width:\s*var\(--content-max-width\)/);
    assert.doesNotMatch(column, /padding-inline:\s*24px/);
  });

  // Live's trigger is a flex row with an 8px gap and three items: a brand-chevron img that
  // .footer__menu__ramChevron hides at 0 width, the h3 label, and the i.footer__menu__chevron glyph.
  // So there is 8px before the label and 8px plus the glyph after it. Measured on /en-gb/our-fleet at
  // 1440: trigger 94.59 against a label of 65.75, so the glyph advance is 12.84px, and the same
  // arithmetic holds on Destinations, 120.95 against 92.11.
  //
  // Ours drew label + 18: an 8px margin plus a 10px box, the 8px square with its two 2px edges. That
  // left each trigger 11px narrower than live's and drifted the row, x 248 against 259 and 422 against
  // 444. The 8px of leading padding and the 3px after the drawn square stand in for live's gap and its
  // glyph advance.
  it('gives the trigger live-s 8px before the label and its glyph advance after', () => {
    const title = rule('.footer-group-title {');
    assert.match(title, /padding-inline-start:\s*8px/);
    const marker = rule('.footer-group-title::after {');
    assert.match(marker, /margin-inline-start:\s*8px/);
    assert.match(marker, /margin-inline-end:\s*3px/);
  });

  it('draws the market notice as live-s band', () => {
    const notice = rule('footer .footer p');
    assert.match(notice, /background-color:\s*var\(--ram-brand-primary-color\)/);
    assert.match(notice, /font-size:\s*var\(--body-font-size-m\)/);
    assert.match(notice, /font-weight:\s*400/);
    assert.match(rootStyles, /--ram-brand-primary-color:\s*#c20831/);
  });
});
