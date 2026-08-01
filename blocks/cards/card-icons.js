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

// The image band still defaults to the icon's 24px in the stylesheet. Reserving the
// photo's 200px for every card left an icon floating in it, where live's icon cards
// are compact, about 110px tall around a 27x36 image. It is also the smaller shift:
// a photo goes 236px to 200px where an icon went 200px to 105px.
export const isPhotoImage = (naturalWidth) => Number(naturalWidth) > ICON_MAX_WIDTH;

// Both kinds get a class of their own. Styling the icon as "not a photo" meant a
// photo card wore the icon's geometry until its image arrived and then changed
// twice, which took layout shift on /en-gb/add-extra-luggage from 0.037 to 0.250 at
// mobile. Waiting for the class means the card holds whatever the type scale gives
// it until then, which is what it did before either rule existed.
export const markIconCards = (list) => {
  list.querySelectorAll('img').forEach((img) => {
    const mark = () => {
      const item = img.closest('li');
      if (!item) return;
      item.classList.add(isPhotoImage(img.naturalWidth) ? 'cards-card-photo' : 'cards-card-icon');
    };
    if (img.complete) mark();
    else img.addEventListener('load', mark, { once: true });
  });
};

// The width the transform wrote on the img, if it wrote one. Reading it before the
// picture is rebuilt is the whole point: naturalWidth needs the network, and the class
// it decides moves the card when it arrives. The number is the same naturalWidth, so
// the verdict is unchanged and only its timing moves.
export const authoredWidth = (img) => {
  const stated = Number(img?.getAttribute('width'));
  return Number.isFinite(stated) && stated > 0 ? stated : null;
};

// Marks what the markup already says, before any image has loaded. An image the
// reading missed is left to markIconCards and keeps its shift, alone.
export const markStatedCards = (list) => {
  let stated = 0;
  list.querySelectorAll('img').forEach((img) => {
    const width = authoredWidth(img);
    const item = img.closest('li');
    if (width === null || !item) return;
    item.classList.add(isPhotoImage(width) ? 'cards-card-photo' : 'cards-card-icon');
    stated += 1;
  });
  return stated;
};
