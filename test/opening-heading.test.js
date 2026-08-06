import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { markArticleHeading, markOpeningHeading } from '../scripts/opening-heading.js';

const heading = (textContent) => {
  const classes = new Set();
  return {
    textContent,
    classList: { add: (name) => classes.add(name), contains: (name) => classes.has(name) },
    classes,
  };
};

const main = ({ h1 = null, h2 = [] }) => ({
  querySelector: (selector) => (selector === 'h1' ? h1 : null),
  querySelectorAll: (selector) => (selector === 'h2' ? h2 : []),
});

describe('markOpeningHeading', () => {
  it('marks the first h2 on a page with no h1', () => {
    const first = heading('Bagages en soute');
    const later = heading('Excess baggage');
    const marked = markOpeningHeading(main({ h2: [first, later] }));
    assert.equal(marked, first);
    assert.equal(first.classList.contains('opening-heading'), true);
    assert.equal(later.classList.contains('opening-heading'), false);
  });

  // 1,623 of the 1,752 documents carry an h1 and it renders at 500, which is the weight live
  // uses for a first heading. Marking an h2 on those pages would weight a later heading.
  it('marks nothing when the page has an h1', () => {
    const h2 = heading('A later heading');
    assert.equal(markOpeningHeading(main({ h1: heading('The title'), h2: [h2] })), null);
    assert.equal(h2.classList.contains('opening-heading'), false);
  });

  it('skips a heading with no readable text and takes the next', () => {
    const empty = heading('   ');
    const real = heading('Voyager avec des animaux');
    assert.equal(markOpeningHeading(main({ h2: [empty, real] })), real);
    assert.equal(empty.classList.contains('opening-heading'), false);
  });

  // 38 of the 107 pages with no h1 carry no heading live weights either, and 10 documents carry no
  // heading at all.
  it('marks nothing when there is no h2', () => {
    assert.equal(markOpeningHeading(main({})), null);
  });

  it('takes a missing container at its word rather than throwing', () => {
    assert.equal(markOpeningHeading(null), null);
    assert.equal(markOpeningHeading(undefined), null);
  });

  it('adds the mark rather than replacing what the heading carries', () => {
    const first = heading('Holidays');
    first.classList.add('authored');
    markOpeningHeading(main({ h2: [first] }));
    assert.equal(first.classList.contains('authored'), true);
    assert.equal(first.classList.contains('opening-heading'), true);
  });
});

// withTitle prepends live's page title as the h1 and demotes the article's own top heading to an h2.
// That happened on 32 documents on 2026-08-06, and on 13 of them live renders the article heading in
// the secondary family at 32px on 40px, weight 300, where ours reads the primary at 32/38.4/300. Only
// the family differs, so the rule keyed on this class sets a family and no weight.
describe('markArticleHeading', () => {
  const heading = (textContent) => {
    const classes = new Set();
    return {
      textContent,
      classList: { add: (name) => classes.add(name), contains: (name) => classes.has(name) },
    };
  };
  const main = ({ h1 = null, h2 = [] }) => ({
    querySelector: (selector) => (selector === 'h1' ? h1 : null),
    querySelectorAll: (selector) => (selector === 'h2' ? h2 : []),
  });

  it('marks the first h2 on a page that has an h1', () => {
    const first = heading('At the airport');
    const later = heading('Baggage');
    const marked = markArticleHeading(main({ h1: heading('2. At the airport'), h2: [first, later] }));
    assert.equal(marked, first);
    assert.equal(first.classList.contains('article-heading'), true);
    assert.equal(later.classList.contains('article-heading'), false);
  });

  // A page with no h1 has its opening heading marked instead, and the two rules set different things:
  // opening-heading takes a weight, article-heading takes a family.
  it('marks nothing when the page has no h1, which is the other rule', () => {
    const h2 = heading('An opening heading');
    assert.equal(markArticleHeading(main({ h2: [h2] })), null);
    assert.equal(h2.classList.contains('article-heading'), false);
  });

  it('skips a heading with no readable text and takes the next', () => {
    const real = heading('On board');
    assert.equal(markArticleHeading(main({ h1: heading('3. On board'), h2: [heading(' '), real] })), real);
  });

  it('marks nothing when the page has no h2, and takes a missing container at its word', () => {
    assert.equal(markArticleHeading(main({ h1: heading('A title') })), null);
    assert.equal(markArticleHeading(null), null);
  });
});
