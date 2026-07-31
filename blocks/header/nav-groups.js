/**
 * Marks the middle level of a nav that is three deep, and reports how deep it goes.
 *
 * The boilerplate styles two levels: a top item and its children. RAM's navigation is
 * three, with 14 group headings organising 80 links under 5 top items, so the middle
 * level needs a hook the CSS can target. A second-level item that holds a list of its
 * own is a group heading; one that does not is an ordinary link.
 *
 * @param {Element} list the nav's top-level ul
 * @returns {number} the deepest level found, 0 for no list
 */
export default function markNavGroups(list) {
  if (!list) return 0;

  const sublist = (item) => item.querySelector(':scope > ul');
  let deepest = 0;

  const walk = (current, level) => {
    const items = [...(current.children || [])];
    if (items.length === 0) return;
    deepest = Math.max(deepest, level);
    items.forEach((item) => {
      const nested = sublist(item);
      if (!nested) return;
      if (level === 2) item.classList.add('nav-group');
      walk(nested, level + 1);
    });
  };

  walk(list, 1);
  return deepest;
}
