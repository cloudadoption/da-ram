/*
 * A panel can hold a block of its own. Live's alliance-partnerships and both safar-flyer
 * tier pages put a table inside every collapsed panel: 120 panels over 30 pages, each
 * holding a table and a list.
 *
 * EDS decorates blocks at main > div > div only, so a table nested in an accordion answer
 * never loads its JS or its CSS and renders as bare divs. The accordion decorates them
 * itself, and this module holds the part that needs no DOM so it can be tested: importing
 * scripts/aem.js reads window at module scope.
 */

/**
 * Reads the block name a nested element declares, which is its first class.
 *
 * @param {string} className the element's class attribute
 * @returns {string|null} the block name, or null where the element declares none
 */
export default function nestedBlockName(className) {
  return String(className || '').trim().split(/\s+/)[0] || null;
}
