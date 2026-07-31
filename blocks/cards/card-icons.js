/*
 * Live's card images come in two shapes. A photo fills the card and is 200px
 * tall, 377x200 on preparing-your-trip. An icon sits at its natural size, 105 and
 * 106px on how-it-works and 27x36 on checked-baggage. The transform marks
 * neither, so the block decides from the image's own size: giving every card
 * image a 200px height blew a 105x105 icon up to 397x200 and cropped it.
 */

export const ICON_MAX_WIDTH = 200;

export const isIconImage = (naturalWidth) => Number(naturalWidth) > 0
  && Number(naturalWidth) <= ICON_MAX_WIDTH;

export const markIconCards = (list) => {
  list.querySelectorAll('img').forEach((img) => {
    const mark = () => {
      if (!isIconImage(img.naturalWidth)) return;
      const item = img.closest('li');
      if (item) item.classList.add('cards-card-icon');
    };
    if (img.complete) mark();
    else img.addEventListener('load', mark, { once: true });
  });
};
