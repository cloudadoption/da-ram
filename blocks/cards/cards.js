import { createOptimizedPicture } from '../../scripts/aem.js';
import { markIconCards, markStatedCards } from './card-icons.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  // Before createOptimizedPicture rebuilds the picture and drops the width the
  // transform wrote. That width is what lets the card know whether it holds an icon
  // or a photo without waiting for the network.
  markStatedCards(ul);
  // createOptimizedPicture builds a fresh img from the src and alt alone, so the width
  // and height the transform wrote are dropped. Without them the card image is 0 wide
  // until it loads, and a lazy image with no width never intersects the viewport, so it
  // never loads: 6 of the 21 images on /en-gb/how-it-works stayed invisible.
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    const replacement = optimized.querySelector('img');
    ['width', 'height'].forEach((name) => {
      const stated = img.getAttribute(name);
      if (stated && replacement) replacement.setAttribute(name, stated);
    });
    img.closest('picture').replaceWith(optimized);
  });
  markIconCards(ul);
  block.replaceChildren(ul);
}
