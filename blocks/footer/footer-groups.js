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

/*
 * Live's social row is five links to its own accounts, drawn as five glyphs from the ram-icons font
 * at 36px, 16px apart, white at rest and brand red on hover. Measured on /en-gb/our-fleet:
 * Facebook, X, Instagram, YouTube and Messenger, the same five in the same order at both widths.
 *
 * It reaches the document as a bare list with no heading, so markFooterBar would give it the legal
 * bar's class and its item dividers. A list whose every item is one link to a known social host is
 * the social row instead, and each link is named so the CSS can pick its mark. Classifying by
 * content rather than by position, because the authored document decides the order of its rows.
 */
const SOCIAL_HOST = [
  [/(^|\.)facebook\.com$/, 'facebook'],
  [/(^|\.)(twitter|x)\.com$/, 'x'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)youtube\.com$/, 'youtube'],
  [/(^|\.)(m\.me|messenger\.com)$/, 'messenger'],
];

const socialNetwork = (href) => {
  if (!href) return null;
  let host;
  try {
    host = new URL(href, 'https://example.invalid').hostname.toLowerCase();
  } catch {
    return null;
  }
  const hit = SOCIAL_HOST.find(([pattern]) => pattern.test(host));
  return hit ? hit[1] : null;
};

// One link per item and nothing else, which is what live's row holds. A list mixing a social link
// with one of our own pages is the legal bar, not this.
const socialLinks = (list) => {
  const items = [...(list.children || [])];
  if (items.length < 2) return null;
  const found = items.map((li) => {
    const kids = [...(li.children || [])];
    if (kids.length !== 1 || kids[0].tagName !== 'A') return null;
    const href = kids[0].getAttribute ? kids[0].getAttribute('href') : kids[0].href;
    const network = socialNetwork(href);
    return network ? [kids[0], network] : null;
  });
  return found.every(Boolean) ? found : null;
};

export const markFooterSocial = (root, depth = 6) => {
  if (!root || depth < 0) return 0;
  if (LIST.test(root.tagName) || root.tagName === 'LI') return 0;
  const children = [...(root.children || [])];
  const nested = children.reduce((total, child) => total + markFooterSocial(child, depth - 1), 0);
  const here = children
    .filter((child) => LIST.test(child.tagName) && !child.classList.contains('footer-social-list'))
    .map((child) => [child, socialLinks(child)])
    .filter(([, links]) => links);
  here.forEach(([list, links]) => {
    list.classList.add('footer-social-list');
    links.forEach(([link, network]) => {
      link.classList.add(`icon-${network}`);
      // The mask needs background-color: currentcolor, so the anchor's colour is the mark's colour
      // and text in it is the colour of the box it sits on. Moving the name into aria-label keeps
      // it
      // for a screen reader, leaves nothing for a contrast check to fail on, and lets the anchor
      // degrade to a readable text link if this never runs.
      const name = (link.textContent || '').trim();
      if (name) link.setAttribute('aria-label', name);
      if (link.replaceChildren) link.replaceChildren();
    });
  });
  return here.length + nested;
};

/*
 * Live's payment row is its market's accepted methods as logos: 25 on en-GB down to 6 on ru-RU and
 * tr-TR, and the set differs per market because the methods do. Each is 40x24 from
 * .footer__paymentImage{width:2.5rem;height:1.5rem}, and at 1440 the row wraps after 17 of them.
 *
 * It reaches the document as a bare list of images, so markFooterBar would claim it the way it
 * would claim the social row. A list whose every item is one image is the payment row.
 */
// The pipeline wraps an authored image in a picture with its source set, so the item's only child
// is a PICTURE by the time this runs. Reading either shape keeps the pass working on a raw
// document too.
const paymentImages = (list) => {
  const items = [...(list.children || [])];
  if (items.length < 2) return false;
  return items.every((li) => {
    const kids = [...(li.children || [])];
    if (kids.length !== 1) return false;
    if (kids[0].tagName === 'IMG') return true;
    if (kids[0].tagName !== 'PICTURE') return false;
    return [...(kids[0].children || [])].some((kid) => kid.tagName === 'IMG');
  });
};

export const markFooterPayment = (root, depth = 6) => {
  if (!root || depth < 0) return 0;
  if (LIST.test(root.tagName) || root.tagName === 'LI') return 0;
  const children = [...(root.children || [])];
  const nested = children.reduce((total, child) => total + markFooterPayment(child, depth - 1), 0);
  const here = children.filter((child) => LIST.test(child.tagName)
    && !child.classList.contains('footer-payment-list')
    && paymentImages(child));
  here.forEach((list) => list.classList.add('footer-payment-list'));
  return here.length + nested;
};

/*
 * Below the three columns live shows a bar of three links: the site map, the
 * terms and the partner page. It is always visible, so it reaches the document
 * as a list with no heading and markFooterGroups passes over it. Run this after
 * markFooterGroups, which is what claims the group lists.
 */
export const markFooterBar = (root, depth = 6) => {
  if (!root || depth < 0) return 0;
  // A list inside a list item is a sub-group of a column, not the bar.
  if (LIST.test(root.tagName) || root.tagName === 'LI') return 0;
  const children = [...(root.children || [])];
  const nested = children.reduce((total, child) => total + markFooterBar(child, depth - 1), 0);
  // Read the heading pairs from the markup rather than from the class
  // markFooterGroups adds, so neither pass depends on which ran first.
  const claimed = new Set(footerGroups(children).map(([, listAt]) => children[listAt]));
  const here = children.filter((child) => LIST.test(child.tagName)
    && !claimed.has(child)
    && !child.classList.contains('footer-social-list')
    && !child.classList.contains('footer-payment-list')
    && !child.classList.contains('footer-bar-list'));
  here.forEach((list) => list.classList.add('footer-bar-list'));
  return here.length + nested;
};

/**
 * Removes the target attribute markExternalLinks set on the footer's links.
 *
 * live's footer holds 113 anchors and not one carries a target, so each of its 59
 * destination links navigates in place. The footer fragment reaches markExternalLinks
 * through loadFragment, which calls decorateMain, and 50 came out with target="_blank"
 * on es-ES. Decision 0037 says the footer works as on live, so this clears them.
 *
 * @param {Element} root the footer element
 * @returns {number} how many targets were cleared
 */
export const clearFooterTargets = (root) => {
  if (!root) return 0;
  let cleared = 0;
  root.querySelectorAll('a[href]').forEach((link) => {
    if (!link.getAttribute('target')) return;
    link.removeAttribute('target');
    cleared += 1;
  });
  return cleared;
};
