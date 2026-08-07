import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clearFooterTargets } from '../blocks/footer/footer-groups.js';

// live's footer holds 113 anchors and not one carries a target: each of its 59 destination
// links navigates in place. ours reached them through loadFragment, which calls decorateMain,
// which calls markExternalLinks, and 50 came out with target="_blank". decision 0037 says the
// footer works as on live, so the footer clears what markExternalLinks set.
const anchor = (href, target) => {
  const attrs = new Map();
  if (target) attrs.set('target', target);
  return {
    tagName: 'A',
    getAttribute: (name) => (name === 'href' ? href : (attrs.get(name) ?? null)),
    removeAttribute: (name) => attrs.delete(name),
    hasAttribute: (name) => attrs.has(name),
  };
};
const root = (...anchors) => ({ querySelectorAll: () => anchors });

describe('clearFooterTargets', () => {
  it('removes the target from a destination link', () => {
    const one = anchor('https://www.royalairmaroc.com/en/vols-pour-istanbul', '_blank');
    clearFooterTargets(root(one));
    assert.equal(one.getAttribute('target'), null);
  });

  it('removes the target from a link to another host, which live also leaves bare', () => {
    const one = anchor('https://cargo.royalairmaroc.com/', '_blank');
    clearFooterTargets(root(one));
    assert.equal(one.getAttribute('target'), null);
  });

  it('leaves a link that never had one alone', () => {
    const one = anchor('/en-gb/site-map');
    clearFooterTargets(root(one));
    assert.equal(one.getAttribute('target'), null);
  });

  it('reports how many it cleared', () => {
    const found = clearFooterTargets(root(
      anchor('https://www.royalairmaroc.com/en/vols-pour-istanbul', '_blank'),
      anchor('https://cargo.royalairmaroc.com/', '_blank'),
      anchor('/en-gb/site-map'),
    ));
    assert.equal(found, 2);
  });

  it('is 0 for a footer with no link', () => {
    assert.equal(clearFooterTargets(root()), 0);
  });

  it('does nothing for no root', () => {
    assert.equal(clearFooterTargets(null), 0);
  });
});
