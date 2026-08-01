import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  videoId, embedUrl, videoParagraphs, decorateVideoLinks,
} from '../scripts/video-embed.js';

// The transform emits an embedded video as a bare link in its own paragraph,
// because the DA canvas cannot carry an iframe. 38 pages across all ten
// languages have one. Rendered as a link it reads as a URL in the copy, so the
// page has to turn it back into a frame.
describe('videoId', () => {
  it('reads the id from an embed url', () => {
    assert.equal(videoId('https://www.youtube.com/embed/_KMGy0hvECQ?controls=0'), '_KMGy0hvECQ');
  });

  it('reads the id from a watch url', () => {
    assert.equal(videoId('https://www.youtube.com/watch?v=_KMGy0hvECQ'), '_KMGy0hvECQ');
  });

  it('reads the id from a short url', () => {
    assert.equal(videoId('https://youtu.be/_KMGy0hvECQ'), '_KMGy0hvECQ');
  });

  it('returns null for anything else', () => {
    assert.equal(videoId('https://www.royalairmaroc.com/en-gb/checked-baggage'), null);
    assert.equal(videoId(''), null);
  });
});

describe('embedUrl', () => {
  it('keeps the parameters live sets, because controls=0 is how live plays it', () => {
    assert.equal(
      embedUrl('https://www.youtube.com/embed/_KMGy0hvECQ?controls=0'),
      'https://www.youtube.com/embed/_KMGy0hvECQ?controls=0',
    );
  });

  it('builds an embed url from a watch url', () => {
    assert.equal(
      embedUrl('https://www.youtube.com/watch?v=_KMGy0hvECQ'),
      'https://www.youtube.com/embed/_KMGy0hvECQ',
    );
  });
});

// The real createElement uppercases tagName, so the fake has to as well or a
// test passes on a shape the browser never produces.
const element = (tag, text = '') => {
  const el = {
    tagName: String(tag).toUpperCase(),
    textContent: text,
    children: [],
    attrs: {},
    className: '',
    setAttribute: (k, v) => { el.attrs[k] = String(v); },
    getAttribute: (k) => el.attrs[k] ?? null,
    addEventListener: (name, fn) => { el.attrs[`on:${name}`] = fn; },
    append: (...kids) => el.children.push(...kids),
    replaceChildren: (...kids) => { el.children = kids; },
    replaceWith: (node) => { el.replacedWith = node; },
    querySelector: (sel) => el.querySelectorAll(sel)[0] || null,
    querySelectorAll: (sel) => (sel === 'a' ? el.links || [] : []),
  };
  return el;
};

const doc = { createElement: (tag) => element(tag) };

const paragraphWith = (href, label = href, text = null) => {
  const link = element('A', label);
  link.setAttribute('href', href);
  const p = element('P', text ?? label);
  p.links = [link];
  return p;
};

const mainWith = (paragraphs) => ({
  querySelectorAll: (sel) => (sel === 'p' ? paragraphs : []),
});

describe('videoParagraphs', () => {
  it('takes a paragraph that is only a video link', () => {
    const p = paragraphWith('https://www.youtube.com/embed/_KMGy0hvECQ');
    assert.equal(videoParagraphs(mainWith([p])).length, 1);
  });

  it('leaves a paragraph with copy around the link, which is a sentence', () => {
    const p = paragraphWith('https://youtu.be/_KMGy0hvECQ', 'the film', 'Watch the film here');
    assert.equal(videoParagraphs(mainWith([p])).length, 0);
  });

  it('leaves an ordinary link alone', () => {
    const p = paragraphWith('/en-gb/checked-baggage');
    assert.equal(videoParagraphs(mainWith([p])).length, 0);
  });
});

describe('decorateVideoLinks', () => {
  it('replaces the paragraph with a wrapper and reports the count', () => {
    const p = paragraphWith('https://www.youtube.com/embed/_KMGy0hvECQ?controls=0');
    assert.equal(decorateVideoLinks(mainWith([p]), doc), 1);
    assert.equal(p.replacedWith.className, 'video-embed');
  });

  it('builds no iframe until the play button is clicked', () => {
    const p = paragraphWith('https://www.youtube.com/embed/_KMGy0hvECQ?controls=0');
    decorateVideoLinks(mainWith([p]), doc);
    const wrapper = p.replacedWith;
    assert.equal(wrapper.children.length, 1);
    assert.equal(wrapper.children[0].tagName, 'BUTTON');
    wrapper.children[0].attrs['on:click']();
    assert.equal(wrapper.children[0].tagName, 'IFRAME');
    assert.match(wrapper.children[0].attrs.src, /autoplay=1/);
  });

  it('keeps the parameters live sets and appends autoplay with an ampersand', () => {
    const p = paragraphWith('https://www.youtube.com/embed/_KMGy0hvECQ?controls=0');
    decorateVideoLinks(mainWith([p]), doc);
    p.replacedWith.children[0].attrs['on:click']();
    assert.equal(
      p.replacedWith.children[0].attrs.src,
      'https://www.youtube.com/embed/_KMGy0hvECQ?controls=0&autoplay=1',
    );
  });
});
