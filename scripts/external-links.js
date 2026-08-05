/*
 * Opens a link to another host in a new tab, the way live does.
 *
 * Live writes 6,524 target attributes across the estate and 389 of them are the
 * conventional case, a _blank on another domain, on 161 pages in all ten markets. The
 * rest do no work: 4,709 are on an anchor with no href or only a fragment, 557 misspell
 * it _blanck so each one replaces the last in a window called _blanck, 213 put a
 * Bootstrap tab id in the attribute, and 604 open one of the client's own pages in a new
 * tab. Resolving the href drops each of those classes without naming any of them.
 *
 * It is here rather than in the document because the html pipeline strips a target
 * attribute. Measured on 2026-08-05: an authored
 * <a href="https://www.oneworld.com/..." target="_blank"> on
 * en-gb/oneworld/frequent-flyer-benefits came back off the preview host with the target
 * gone.
 *
 * No rel. Live adds none on any of the 389, and a browser has implied noopener for
 * target="_blank" since Chrome 88, so adding one would be a divergence with no behaviour
 * behind it.
 */

/**
 * Whether an href leaves this site.
 *
 * @param {string} href the anchor's href, as authored
 * @param {string} host the host to compare against
 * @returns {boolean} true when it resolves to another host over http or https
 */
export const isExternalHref = (href, host) => {
  const raw = String(href || '').trim();
  if (!raw || raw.startsWith('#')) return false;
  let url;
  try {
    url = new URL(raw, `https://${host}/`);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return url.host !== host;
};

/**
 * Sets target on each link in the container that leaves this site.
 *
 * A target somebody authored is left alone, so this cannot overrule a choice.
 *
 * @param {Element} container usually the main element
 * @param {string} [host] defaults to the current host
 */
export const markExternalLinks = (container, host = window.location.host) => {
  if (!container) return;
  container.querySelectorAll('a[href]').forEach((link) => {
    if (link.getAttribute('target')) return;
    if (!isExternalHref(link.getAttribute('href'), host)) return;
    link.setAttribute('target', '_blank');
  });
};
