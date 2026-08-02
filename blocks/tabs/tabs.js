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

  rows.forEach((row) => row.remove());
  block.append(list, select, ...panels);
  show(panels, tabs, select, 0);
}
