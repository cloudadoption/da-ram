import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { imageRuns, wrapImageRuns } from '../scripts/image-rows.js';

// `i` is an image-only paragraph, `t` is anything else.
const isImageOnly = (item) => item === 'i';

describe('imageRuns', () => {
  it('finds a run of two', () => {
    assert.deepEqual(imageRuns(['t', 'i', 'i', 't'], isImageOnly), [[1, 2]]);
  });

  it('ignores a lone image, which is a picture in its own right', () => {
    assert.deepEqual(imageRuns(['t', 'i', 't', 'i'], isImageOnly), []);
  });

  it('finds two separate runs', () => {
    assert.deepEqual(imageRuns(['i', 'i', 't', 'i', 'i', 'i'], isImageOnly), [[0, 1], [3, 4, 5]]);
  });

  it('finds a run that ends the list', () => {
    assert.deepEqual(imageRuns(['t', 'i', 'i', 'i'], isImageOnly), [[1, 2, 3]]);
  });

  it('finds a run that starts the list', () => {
    assert.deepEqual(imageRuns(['i', 'i', 't'], isImageOnly), [[0, 1]]);
  });

  it('returns nothing for a list with no images', () => {
    assert.deepEqual(imageRuns(['t', 't'], isImageOnly), []);
  });

  it('returns nothing for an empty list', () => {
    assert.deepEqual(imageRuns([], isImageOnly), []);
  });

  it('treats the whole list as one run when every item is an image', () => {
    assert.deepEqual(imageRuns(['i', 'i', 'i'], isImageOnly), [[0, 1, 2]]);
  });
});

// A stub standing in for the pieces of the DOM the wrapper touches. Appending a
// node moves it, as the real DOM does: without that the paragraphs would sit in
// both the wrapper and the row and the tests would pass on a fiction.
const detach = (node) => {
  if (!node.parent) return;
  const at = node.parent.children.indexOf(node);
  if (at >= 0) node.parent.children.splice(at, 1);
};

const element = (tag) => {
  const node = {
    tag,
    children: [],
    className: '',
    parent: null,
    append(...kids) {
      kids.forEach((kid) => {
        detach(kid);
        node.children.push(kid);
        kid.parent = node;
      });
    },
    insertBefore(fresh, before) {
      detach(fresh);
      const at = node.children.indexOf(before);
      node.children.splice(at < 0 ? node.children.length : at, 0, fresh);
      fresh.parent = node;
    },
  };
  return node;
};

const wrapperWith = (kinds) => {
  const wrapper = element('div');
  kinds.forEach((kind) => {
    const child = element('p');
    child.kind = kind;
    wrapper.append(child);
  });
  return wrapper;
};

const documentStub = { createElement: (tag) => element(tag) };

describe('wrapImageRuns', () => {
  const imageKind = (node) => node.kind === 'i';

  it('wraps a run in one container', () => {
    const wrapper = wrapperWith(['t', 'i', 'i', 't']);
    wrapImageRuns(wrapper, documentStub, imageKind);
    assert.equal(wrapper.children.length, 3);
    assert.match(wrapper.children[1].className, /\bimage-row\b/);
    assert.equal(wrapper.children[1].children.length, 2);
  });

  it('keeps the container where the run was', () => {
    const wrapper = wrapperWith(['t', 'i', 'i', 't']);
    wrapImageRuns(wrapper, documentStub, imageKind);
    assert.equal(wrapper.children[0].kind, 't');
    assert.equal(wrapper.children[2].kind, 't');
  });

  it('leaves a lone image where it is', () => {
    const wrapper = wrapperWith(['t', 'i', 't']);
    wrapImageRuns(wrapper, documentStub, imageKind);
    assert.equal(wrapper.children.length, 3);
    assert.equal(wrapper.children[1].kind, 'i');
  });

  it('wraps two runs separately', () => {
    const wrapper = wrapperWith(['i', 'i', 't', 'i', 'i']);
    wrapImageRuns(wrapper, documentStub, imageKind);
    const rows = wrapper.children.filter((c) => /\bimage-row\b/.test(c.className));
    assert.equal(rows.length, 2);
  });

  it('records how many are in the row, so CSS can lay a pair out differently', () => {
    const wrapper = wrapperWith(['i', 'i', 'i']);
    wrapImageRuns(wrapper, documentStub, imageKind);
    assert.equal(wrapper.children[0].className, 'image-row image-row-3');
  });

  it('does nothing to a wrapper with no run', () => {
    const wrapper = wrapperWith(['t', 't']);
    wrapImageRuns(wrapper, documentStub, imageKind);
    assert.deepEqual(wrapper.children.map((c) => c.kind), ['t', 't']);
  });
});
