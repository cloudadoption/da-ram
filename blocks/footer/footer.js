import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import {
  clearFooterTargets, markFooterBar, markFooterGroups, markFooterPayment, markFooterSocial,
} from './footer-groups.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  // loadFragment calls decorateMain, which marks a link leaving this host. live's footer
  // carries no target on any of its 113 anchors. Decision 0037: the footer works as on live.
  clearFooterTargets(footer);

  markFooterGroups(footer);
  // Before markFooterBar, which claims every bare list it finds.
  markFooterSocial(footer);
  markFooterPayment(footer);
  markFooterBar(footer);
  block.append(footer);
}
