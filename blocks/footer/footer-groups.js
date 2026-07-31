/*
 * Live's footer is 280px tall and shows 36 of its 114 links: the three link
 * lists sit behind their headings and open on a click. The migrated footer
 * showed all 71 of its links and ran to 1,513px, which is 1,233px added to the
 * bottom of every page in the estate.
 *
 * The links stay in the document, so a crawler still reads them.
 */

const HEADING = /^H[1-6]$/;
const LIST = /^(UL|OL)$/;

export const footerGroups = (children) => {
  const groups = [];
  children.forEach((child, index) => {
    if (!HEADING.test(child.tagName)) return;
    const next = children[index + 1];
    if (next && LIST.test(next.tagName)) groups.push([index, index + 1]);
  });
  return groups;
};

const markIn = (container) => {
  const children = [...(container.children || [])];
  const groups = footerGroups(children).filter(([titleAt]) => !children[titleAt].getAttribute('aria-expanded'));
  groups.forEach(([titleAt, listAt]) => {
    const title = children[titleAt];
    const list = children[listAt];
    title.classList.add('footer-group-title');
    list.classList.add('footer-group-list');
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    title.setAttribute('aria-expanded', 'false');
    // The block's CSS arrives after the footer markup, so a group closed by a
    // class alone paints open and then shuts: CLS went from 0 to 0.232 on
    // mobile. An inline display needs no stylesheet to be in force.
    list.style.display = 'none';
    const toggle = () => {
      const open = title.getAttribute('aria-expanded') === 'true';
      title.setAttribute('aria-expanded', open ? 'false' : 'true');
      list.style.display = open ? 'none' : '';
    };
    title.addEventListener('click', toggle);
    title.addEventListener('keydown', (event) => {
      if (event && (event.key === 'Enter' || event.key === ' ')) {
        if (event.preventDefault) event.preventDefault();
        toggle();
      }
    });
  });
  return groups.length;
};

// The real tree is footer > .footer.block > wrapper > .section >
// .default-content-wrapper > h2, so a fixed depth is the wrong thing to code
// against: marking the wrapper's own children found nothing and the footer
// shipped expanded. This walks the subtree instead.
export const markFooterGroups = (root, depth = 6) => {
  if (!root || depth < 0) return 0;
  const nested = [...(root.children || [])]
    .reduce((total, child) => total + markFooterGroups(child, depth - 1), 0);
  return markIn(root) + nested;
};
