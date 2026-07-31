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

export const markFooterGroups = (footer) => {
  const children = [...footer.children];
  const groups = footerGroups(children);
  groups.forEach(([titleAt, listAt]) => {
    const title = children[titleAt];
    const list = children[listAt];
    title.classList.add('footer-group-title');
    list.classList.add('footer-group-list');
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    title.setAttribute('aria-expanded', 'false');
    const toggle = () => {
      const open = title.getAttribute('aria-expanded') === 'true';
      title.setAttribute('aria-expanded', open ? 'false' : 'true');
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
