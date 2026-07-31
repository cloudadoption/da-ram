import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { markNavGroups } from '../blocks/header/nav-groups.js';

// A list item stands in for an li. `sub` is its nested list, if it has one.
const item = (sub = null) => {
  const classes = new Set();
  return {
    classList: { add: (c) => classes.add(c), contains: (c) => classes.has(c) },
    querySelector: (selector) => (selector === ':scope > ul' ? sub : null),
    children: sub ? [sub] : [],
    classes,
  };
};
const list = (items) => ({ children: items });

describe('markNavGroups', () => {
  // RAM's live nav is three levels: top item, group heading, link. 5 top items, 14
  // group headings, 80 leaf links. The boilerplate styles two, so the middle level
  // needs a hook the CSS can target.
  it('marks a second level item that holds its own list', () => {
    const leaf = item();
    const group = item(list([leaf]));
    const top = item(list([group]));
    markNavGroups(list([top]));
    assert.equal(group.classList.contains('nav-group'), true);
    assert.equal(leaf.classList.contains('nav-group'), false);
  });

  it('leaves a second level item with no list of its own alone', () => {
    const plain = item();
    const top = item(list([plain]));
    markNavGroups(list([top]));
    assert.equal(plain.classList.contains('nav-group'), false);
  });

  it('does not mark the top level, which already has nav-drop', () => {
    const group = item(list([item()]));
    const top = item(list([group]));
    markNavGroups(list([top]));
    assert.equal(top.classList.contains('nav-group'), false);
  });

  it('reports the deepest level it found, so a nav deeper than three is visible', () => {
    const shallow = list([item(list([item()]))]);
    assert.equal(markNavGroups(shallow), 2);
    const three = list([item(list([item(list([item()]))]))]);
    assert.equal(markNavGroups(three), 3);
  });

  it('handles a nav with no nesting at all', () => {
    assert.equal(markNavGroups(list([item(), item()])), 1);
  });

  it('handles an absent list', () => {
    assert.equal(markNavGroups(null), 0);
  });
});
