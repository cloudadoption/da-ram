/*
 * Marks the top heading of a page so CSS can style it the way live does. Two cases, a class each.
 *
 * A page with no h1 gets `opening-heading` on its first h2, and that rule sets a weight. One with
 * an h1 gets `article-heading` on its first h2, which is the article's own top heading after
 * withTitle prepended live's page title and demoted it. That rule sets a family.
 *
 * The weight case:
 *
 * 1,623 of the 1,752 documents carry an h1 and h1 renders at weight 500 here, which is what live
 * gives a first heading: 500 on 59% of 515 pages measured. 107 pages carry no h1 and that is
 * faithful, because live has no page-heading component on them and its only h1 there is the brand
 * mark. Those pages open with an h2 instead, and h2 is 300 here, the weight live gives a
 * later heading: 400 of its 710 later 32px h2s.
 *
 * So the opening heading of a no-h1 page took the later-heading weight. Read from live on
 * 2026-08-06, one request per path over all 107: of the 69 that carry a heading live weights,
 * 50 render at 500 and 19 at 300. 39 of the 50 have an opening h2 in the document here, so the
 * default below is 500 and the 19 opt out through `theme: opening-heading-light`.
 *
 * It is JS rather than CSS because no selector reaches the element.
 * `main h2:first-of-type` matches four headings on /ar-sa/consignes-de-securite, and on
 * /de-de/holidays the only h2 is in a later section, so a section-scoped selector misses it.
 */

// A heading shorter than this is a marker rather than a title, the floor the parity readers use.
const READABLE = 3;

const firstReadableH2 = (container) => [...container.querySelectorAll('h2')]
  .find((heading) => (heading.textContent || '').trim().length >= READABLE) || null;

/**
 * Adds `opening-heading` to the first readable h2 of a container that holds no h1.
 *
 * @param {Element} container usually the main element
 * @returns {Element|null} the heading marked, or null where there is none to mark
 */
export const markOpeningHeading = (container) => {
  if (!container) return null;
  if (container.querySelector('h1')) return null;
  const opening = firstReadableH2(container);
  if (!opening) return null;
  opening.classList.add('opening-heading');
  return opening;
};

/**
 * Adds `article-heading` to the first readable h2 of a container that holds an h1.
 *
 * withTitle prepends live's page title as the h1 and demotes the article's own top heading to an
 * h2, which it did on 32 documents on 2026-08-06. Live renders 13 of those headings in the
 * secondary family at 32px on 40px, weight 300, and ours read the primary at 32/38.4/300. So
 * that rule sets a family and leaves the weight alone.
 *
 * @param {Element} container usually the main element
 * @returns {Element|null} the heading marked, or null where there is none to mark
 */
export const markArticleHeading = (container) => {
  if (!container) return null;
  if (!container.querySelector('h1')) return null;
  const article = firstReadableH2(container);
  if (!article) return null;
  article.classList.add('article-heading');
  return article;
};
