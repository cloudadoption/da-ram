import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { markOpeningHeading } from '../scripts/opening-heading.js';

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

  // 1,623 of the 1,752 documents carry an h1 and it already renders at 500, which is the weight live
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
