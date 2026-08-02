import { loadCSS } from './aem.js';

/*
 * The pipeline cannot deliver a block inside a block. Probed on
 * main--da-ram--cloudadoption with an accordion whose three cells held a div block, a real
 * table and a list: the div block came back as a run of paragraphs, the table and the list
 * came back intact.
 *
 * So a table inside a panel is authored as a real table, and the wrapper the table block's
 * stylesheet needs is rebuilt here. Live's alliance-partnerships,
 * general-terms-and-conditions and reduced-mobility families put one inside a collapsed
 * panel: 30 documents. Before this the delivered answer read
 * "Country Code Airline Airline Sénégal HC Air Senegal" down the page.
 *
 * table.css is loaded rather than restated, or the look would drift from the block's.
 */

/**
 * Wraps each unwrapped table under `root` so the table block's stylesheet applies to it.
 *
 * @param {Element} root the element to search
 * @returns {number} how many tables were wrapped
 */
export default function styleBareTables(root) {
  const bare = [...root.querySelectorAll('table')].filter((table) => !table.closest('.table'));
  bare.forEach((table) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'table';
    table.replaceWith(wrapper);
    wrapper.append(table);
  });
  if (bare.length) loadCSS(`${window.hlx.codeBasePath}/blocks/table/table.css`);
  return bare.length;
}
