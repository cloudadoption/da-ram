import { createOptimizedPicture } from '../../scripts/aem.js';
import { markIconCards } from './card-icons.js';

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
  // Eager, so the image is complete when markIconCards runs and the card is
  // sized before the first paint. Lazy loading put the class on after layout and
  // the card resized under the reader: 0.1432 of a 0.1591 CLS on checked-baggage.
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, true, [{ width: '750' }])));
  markIconCards(ul);
  block.replaceChildren(ul);
}
