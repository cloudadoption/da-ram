/**
 * The control a nav dropdown opens with.
 *
 * A drop is an li holding a label and a sublist. `#88` gave the li `role="button"` so its
 * `aria-expanded` would be valid, and ARIA does not allow that role on an li: axe reads
 * `aria-allowed-role` on the four drops and `list` on the ul holding them, on every page of the
 * estate. The accessibility tree that reading came from shows the computed role and not whether the
 * element permits it, which is why it could not be seen there.
 *
 * So the control is a real button inside the li, which is the disclosure-navigation pattern. The li
 * keeps `listitem`, the button carries the state, and a button takes Enter and Space on its own.
 *
 * Nine markets author the label as a bare text node before the sublist and nl-NL authors it as a
 * link. A link cannot go inside a button, so that one stays where it is and the button is named
 * after it.
 */

const isText = (node) => node && node.nodeType === 3;
const isElement = (node) => node && node.nodeType === 1;

/**
 * The link a drop labels itself with, where it labels itself with one.
 *
 * @param {Element} drop the li
 * @returns {Element|null} the link, or none where the label is text
 */
export const linkedLabelIn = (drop) => {
  const first = drop && drop.firstElementChild;
  if (!isElement(first) || first.tagName === 'UL') return null;
  return first;
};

/**
 * What the drop calls itself.
 *
 * Its own leading text, else its first element. Never the sublist: a name taken from the whole
 * subtree read 488 characters of submenu on the nl-NL fifth drop.
 *
 * @param {Element} drop the li
 * @returns {string}
 */
export const labelOf = (drop) => {
  if (!drop) return '';
  const own = [...(drop.childNodes || [])]
    .filter(isText)
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
  if (own) return own;
  const linked = linkedLabelIn(drop);
  return linked ? (linked.textContent || '').trim() : '';
};

/**
 * The drop's toggle button, built if it has none.
 *
 * @param {Element} drop the li
 * @param {(tag: string) => Element} make a document.createElement
 * @returns {Element} the button
 */
export const toggleFor = (drop, make) => {
  const held = [...(drop.childNodes || [])].find((one) => one.tagName === 'BUTTON');
  if (held) return held;

  const button = make('button');
  button.setAttribute('type', 'button');
  button.setAttribute('aria-expanded', 'false');
  button.classList.add('nav-drop-toggle');

  const linked = linkedLabelIn(drop);
  if (linked) {
    // The label is a link and a link cannot go inside a button, so the button is named after it.
    button.setAttribute('aria-label', labelOf(drop) || 'Menu');
  } else {
    const own = [...(drop.childNodes || [])].filter(isText);
    if (own.length) {
      button.append(...own);
    } else {
      button.setAttribute('aria-label', 'Menu');
    }
  }

  drop.prepend(button);
  return button;
};
