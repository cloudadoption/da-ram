/*
 * Live embeds a YouTube film inside the article on 38 pages across all ten
 * languages. The DA canvas cannot carry an iframe, so the transform emits the
 * video as a bare link in its own paragraph and the page turns it back into a
 * frame here.
 *
 * The frame is built on click rather than on load. Three of these pages carry
 * two films, and a YouTube iframe costs about 700KB before anyone asks for it.
 */

const EMBED = /youtube\.com\/embed\/([\w-]{6,})/i;
const WATCH = /youtube\.com\/watch\?(?:.*&)?v=([\w-]{6,})/i;
const SHORT = /youtu\.be\/([\w-]{6,})/i;

export const videoId = (href) => {
  const text = String(href || '');
  const match = EMBED.exec(text) || WATCH.exec(text) || SHORT.exec(text);
  return match ? match[1] : null;
};

// An embed url the author already wrote is kept whole, because live plays these
// with controls=0 and dropping that changes how the film looks.
export const embedUrl = (href) => {
  const text = String(href || '');
  if (EMBED.test(text)) return text;
  const id = videoId(text);
  return id ? `https://www.youtube.com/embed/${id}` : null;
};

const isVideoParagraph = (paragraph) => {
  if (paragraph.tagName !== 'P') return false;
  const links = paragraph.querySelectorAll('a');
  if (links.length !== 1) return false;
  const link = links[0];
  if ((paragraph.textContent || '').trim() !== (link.textContent || '').trim()) return false;
  return Boolean(videoId(link.getAttribute('href')));
};

export const videoParagraphs = (main) => [...main.querySelectorAll('p')].filter(isVideoParagraph);

export const decorateVideoLinks = (main, doc = document) => {
  const found = videoParagraphs(main);
  found.forEach((paragraph) => {
    const link = paragraph.querySelector('a');
    const url = embedUrl(link.getAttribute('href'));
    if (!url) return;
    const wrapper = doc.createElement('div');
    wrapper.className = 'video-embed';
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'video-embed-play';
    button.setAttribute('aria-label', link.textContent.trim() || 'Play video');
    button.addEventListener('click', () => {
      const frame = doc.createElement('iframe');
      frame.setAttribute('src', `${url}${url.includes('?') ? '&' : '?'}autoplay=1`);
      frame.setAttribute('allow', 'autoplay; encrypted-media');
      frame.setAttribute('allowfullscreen', '');
      frame.setAttribute('loading', 'lazy');
      frame.setAttribute('title', button.getAttribute('aria-label'));
      wrapper.replaceChildren(frame);
    });
    wrapper.append(button);
    paragraph.replaceWith(wrapper);
  });
  return found.length;
};
