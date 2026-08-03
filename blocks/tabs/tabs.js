/*
 * Live shows one panel of a tab strip and hides the rest, so a page whose five panels
 * all showed carried eight times what a visitor sees:
 * /en-gb/general-terms-and-conditions displays 1,737 characters of 15,088.
 *
 * The transform emits two divs per row, the label then the panel.
 *
 * Live's own control disappears between 992 and 1199 pixels: its select carries
 * d-lg-none and hides from 992, and its tab list appears at 1200, so in that window a
 * visitor cannot reach Legal mentions, Privacy policy, Security or Cookies. That is on
 * the client register and this does not reproduce it. The select is the control below
 * 1200 and the tab list from 1200, with no gap.
 */

import styleBareTables from '../../scripts/bare-tables.js';

const show = (panels, tabs, select, index) => {
  panels.forEach((panel, at) => {
    panel.hidden = at !== index;
  });
  tabs.forEach((tab, at) => {
    tab.setAttribute('aria-selected', String(at === index));
    tab.setAttribute('tabindex', at === index ? '0' : '-1');
  });
  select.selectedIndex = index;
};

// A tab that is not selected carries tabindex -1, so Tab leaves the strip rather than walking it,
// and a key has to move the selection. Without this a keyboard reached 1 panel of 5 at 1440, where
// the select is display:none: measured on en-gb and ar-sa general-terms-and-conditions.
//
// The strip is a flex row, so the horizontal arrows walk it and wrap, and Home and End go to the
// ends. A vertical arrow is left to the browser for scrolling.
//
// ar-sa computes direction rtl and draws tab 1 rightmost: at 1440 the five tabs start at 1074, 916,
// 770, 664 and 558. So the arrows are swapped there, or the right arrow moves the selection left.
// Home and End are not swapped: they mean first and last in reading order, and in RTL the last one
// is the leftmost.
const NEXT = (at, count) => (at + 1) % count;
const PREVIOUS = (at, count) => (at - 1 + count) % count;
const KEYS = (rtl) => ({
  ArrowRight: rtl ? PREVIOUS : NEXT,
  ArrowLeft: rtl ? NEXT : PREVIOUS,
  Home: () => 0,
  End: (at, count) => count - 1,
});

export default function decorate(block) {
  const rows = [...block.children];
  const labels = [];
  const panels = [];
  rows.forEach((row) => {
    const [label, panel] = [...row.children];
    if (!label || !panel) return;
    labels.push((label.textContent || '').trim());
    panel.className = 'tabs-panel';
    panel.setAttribute('role', 'tabpanel');
    // The cookies panel of general-terms-and-conditions holds a table, and the pipeline
    // cannot deliver a block inside a block, so it arrives as a real table.
    styleBareTables(panel);
    panels.push(panel);
  });
  if (!panels.length) return;

  // The same choice as a control a reader can use at a narrow width, which is what live
  // falls back to below 992.
  const select = document.createElement('select');
  select.className = 'tabs-select';
  select.setAttribute('aria-label', labels[0] ? `${labels[0]} and more` : 'Sections');
  labels.forEach((text, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = text;
    select.append(option);
  });

  const list = document.createElement('div');
  list.className = 'tabs-list';
  list.setAttribute('role', 'tablist');
  const tabs = labels.map((text, index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tabs-tab';
    tab.setAttribute('role', 'tab');
    tab.textContent = text;
    tab.addEventListener('click', () => show(panels, tabs, select, index));
    list.append(tab);
    return tab;
  });
  select.addEventListener('change', () => show(panels, tabs, select, Number(select.value)));
  list.addEventListener('keydown', (event) => {
    // Read at the key rather than at decoration: the stylesheet that sets the direction may not
    // have arrived when the block decorates.
    const keys = KEYS(getComputedStyle(list).direction === 'rtl');
    const move = keys[event.key];
    if (!move) return;
    const at = tabs.indexOf(document.activeElement);
    if (at < 0) return;
    event.preventDefault();
    const next = move(at, tabs.length);
    show(panels, tabs, select, next);
    tabs[next].focus();
  });

  rows.forEach((row) => row.remove());
  block.append(list, select, ...panels);
  show(panels, tabs, select, 0);
}
