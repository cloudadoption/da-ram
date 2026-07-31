import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ICON_MAX_WIDTH, isIconImage, isPhotoImage, markIconCards,
} from '../blocks/cards/card-icons.js';

// Live's card images come in two shapes. A photo fills the card and is 200px
// tall: 377x200 on preparing-your-trip. An icon sits at its natural size: 105 and
// 106px on how-it-works, and 27x36 on checked-baggage. The transform marks
// neither, so the block decides from the image's own size. Giving every card
// image `height: 200px` blew a 105x105 icon up to 397x200.
describe('isIconImage', () => {
  it('calls a 105px source an icon, which is what how-it-works carries', () => {
    assert.equal(isIconImage(105), true);
  });

  it('calls a 27px source an icon, which is what checked-baggage carries', () => {
    assert.equal(isIconImage(27), true);
  });

  it('calls a 1647px photograph a photograph', () => {
    assert.equal(isIconImage(1647), false);
  });

  it('takes the threshold as the boundary itself', () => {
    assert.equal(isIconImage(ICON_MAX_WIDTH), true);
    assert.equal(isIconImage(ICON_MAX_WIDTH + 1), false);
  });

  it('says no for an image that has not loaded, so nothing is marked on a guess', () => {
    assert.equal(isIconImage(0), false);
    assert.equal(isIconImage(undefined), false);
  });
});

const listItem = () => {
  const classes = new Set();
  return { classList: { add: (c) => classes.add(c), contains: (c) => classes.has(c) }, classes };
};

const image = (naturalWidth, complete = true) => {
  const li = listItem();
  const handlers = [];
  return {
    naturalWidth,
    complete,
    li,
    closest: (selector) => (selector === 'li' ? li : null),
    addEventListener: (name, fn) => handlers.push([name, fn]),
    fire: (name) => handlers.filter(([n]) => n === name).forEach(([, fn]) => fn()),
  };
};

const listOf = (images) => ({ querySelectorAll: () => images });

describe('markIconCards', () => {
  it('marks the card of a photograph', () => {
    const img = image(1647);
    markIconCards(listOf([img]));
    assert.ok(img.li.classList.contains('cards-card-photo'));
  });

  it('leaves the card of an icon unmarked, because that is the default', () => {
    const img = image(105);
    markIconCards(listOf([img]));
    assert.ok(!img.li.classList.contains('cards-card-photo'));
  });

  it('waits for an image that has not loaded yet', () => {
    const img = image(1647, false);
    markIconCards(listOf([img]));
    assert.ok(!img.li.classList.contains('cards-card-photo'));
    img.fire('load');
    assert.ok(img.li.classList.contains('cards-card-photo'));
  });

  it('marks each card independently', () => {
    const icon = image(106);
    const photo = image(1200);
    markIconCards(listOf([icon, photo]));
    assert.ok(!icon.li.classList.contains('cards-card-photo'));
    assert.ok(photo.li.classList.contains('cards-card-photo'));
  });

  it('is unbothered by an image outside a list item', () => {
    const img = image(1647);
    img.closest = () => null;
    assert.doesNotThrow(() => markIconCards(listOf([img])));
  });
});

// Reserving the photo's 200px band for every card left an icon floating in it:
// live's icon cards are compact, about 110px tall around a 27x36 image. The
// default is the icon now and the photo is what gets marked, which is both
// closer to live and a smaller shift: a photo goes 236px to 200px where an icon
// was going 200px to 105px.
describe('isPhotoImage', () => {
  it('calls a 1647px source a photograph', () => {
    assert.equal(isPhotoImage(1647), true);
  });

  it('leaves a 105px icon alone', () => {
    assert.equal(isPhotoImage(105), false);
  });

  it('takes the same boundary as the icon test, from the other side', () => {
    assert.equal(isPhotoImage(ICON_MAX_WIDTH), false);
    assert.equal(isPhotoImage(ICON_MAX_WIDTH + 1), true);
  });

  it('says no for an image that has not loaded', () => {
    assert.equal(isPhotoImage(0), false);
    assert.equal(isPhotoImage(undefined), false);
  });

  it('is the opposite of isIconImage for anything loaded', () => {
    [27, 105, 200, 201, 1647].forEach((w) => {
      assert.notEqual(isIconImage(w), isPhotoImage(w));
    });
  });
});
