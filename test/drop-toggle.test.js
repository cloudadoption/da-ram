import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { labelOf, linkedLabelIn, toggleFor } from '../blocks/header/drop-toggle.js';

// A nav drop is an li holding a label and a sublist. #88 gave the li role="button" so its
// aria-expanded would be valid, and ARIA does not allow that role on an li: axe read
// aria-allowed-role on the four drops and `list` on the ul holding them, on every page. So the
// control is a real button inside the li, which is the disclosure-navigation pattern.
const text = (value) => ({ nodeType: 3, textContent: value, parent: null });
const element = (tag, textContent = '') => {
  const attrs = {};
  const classes = new Set();
  const node = {
    nodeType: 1,
    tagName: tag,
    textContent,
    childNodes: [],
    attrs,
    classes,
    classList: { add: (c) => classes.add(c), contains: (c) => classes.has(c) },
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => attrs[k] ?? null,
    addEventListener: (name, fn) => { attrs[`on:${name}`] = fn; },
    fire: (name) => attrs[`on:${name}`] && attrs[`on:${name}`](),
  };
  node.append = (...nodes) => nodes.forEach((one) => {
    const child = one;
    if (child.parent) {
      const at = child.parent.childNodes.indexOf(child);
      if (at >= 0) child.parent.childNodes.splice(at, 1);
    }
    child.parent = node;
    node.childNodes.push(child);
  });
  node.prepend = (...nodes) => {
    node.append(...nodes);
    const moved = node.childNodes.splice(node.childNodes.length - nodes.length, nodes.length);
    node.childNodes.unshift(...moved);
  };
  Object.defineProperty(node, 'firstElementChild', {
    get: () => node.childNodes.find((one) => one.nodeType === 1) || null,
  });
  return node;
};
const li = (children) => {
  const item = element('LI');
  children.forEach((one) => item.append(one));
  return item;
};
const make = (tag) => element(tag.toUpperCase());

describe('labelOf', () => {
  it('takes the leading text, which is how nine markets author it', () => {
    assert.equal(labelOf(li([text('Book'), element('UL')])), 'Book');
  });

  it('joins several text nodes and trims', () => {
    assert.equal(labelOf(li([text(' Safar '), text('Flyer '), element('UL')])), 'Safar Flyer');
  });

  it('falls back to the first element, which is how nl-NL authors it', () => {
    const link = element('A', 'Boeken');
    assert.equal(labelOf(li([link, element('UL')])), 'Boeken');
  });

  it('does not take the sublist as the label', () => {
    const sub = element('UL', 'Book a flight Activities');
    assert.equal(labelOf(li([sub])), '');
  });

  it('gives nothing for nothing', () => {
    assert.equal(labelOf(null), '');
  });
});

describe('linkedLabelIn', () => {
  it('finds the link nl-NL authors its label as', () => {
    const link = element('A', 'Boeken');
    assert.equal(linkedLabelIn(li([link, element('UL')])), link);
  });

  it('gives none where the label is a bare text node', () => {
    assert.equal(linkedLabelIn(li([text('Book'), element('UL')])), null);
  });

  it('does not take a link inside the sublist', () => {
    const sub = element('UL');
    sub.append(element('A', 'Book a flight'));
    assert.equal(linkedLabelIn(li([text('Book'), sub])), null);
  });
});

describe('toggleFor', () => {
  it('builds a real button and leaves no role on the li', () => {
    const drop = li([text('Book'), element('UL')]);
    const button = toggleFor(drop, make);
    assert.equal(button.tagName, 'BUTTON');
    assert.equal(button.getAttribute('type'), 'button');
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    assert.ok(button.classList.contains('nav-drop-toggle'));
    assert.equal(drop.getAttribute('role'), null);
    assert.equal(drop.getAttribute('aria-expanded'), null);
    assert.equal(drop.getAttribute('tabindex'), null);
  });

  it('puts the button first, before the sublist', () => {
    const sub = element('UL');
    const drop = li([text('Book'), sub]);
    const button = toggleFor(drop, make);
    assert.equal(drop.childNodes[0], button);
  });

  it('moves the label text into the button, so it names itself from content', () => {
    const word = text('Book');
    const drop = li([word, element('UL')]);
    const button = toggleFor(drop, make);
    assert.ok(button.childNodes.includes(word));
    assert.equal(drop.childNodes.includes(word), false);
    assert.equal(button.getAttribute('aria-label'), null);
  });

  it('leaves a linked label where it is and names the button after it', () => {
    const link = element('A', 'Boeken');
    const drop = li([link, element('UL')]);
    const button = toggleFor(drop, make);
    assert.equal(drop.childNodes.includes(link), true);
    assert.equal(button.childNodes.includes(link), false);
    assert.equal(button.getAttribute('aria-label'), 'Boeken');
  });

  it('does not take the sublist into the button', () => {
    const sub = element('UL');
    const drop = li([text('Book'), sub]);
    const button = toggleFor(drop, make);
    assert.equal(button.childNodes.includes(sub), false);
    assert.equal(drop.childNodes.includes(sub), true);
  });

  it('names the button Menu where the drop labels itself with nothing', () => {
    const drop = li([element('UL')]);
    assert.equal(toggleFor(drop, make).getAttribute('aria-label'), 'Menu');
  });

  it('builds one button on a second pass', () => {
    const drop = li([text('Book'), element('UL')]);
    const first = toggleFor(drop, make);
    assert.equal(toggleFor(drop, make), first);
    assert.equal(drop.childNodes.filter((one) => one.tagName === 'BUTTON').length, 1);
  });
});
