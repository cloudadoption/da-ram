/**
 * The payment methods for a country, rebuilt on a sheet.
 *
 * Decision 0038 rebuilds this control. live keeps the data inside a Liferay portlet and answers one
 * country at a time, so the sheet was read country by country from fr-FR on 2026-08-07. The
 * method set per
 * country matches every market, checked on MA, FR and AO over fr-FR, de-DE and ru-RU, because the
 * method
 * names are brands. Only the group label differs per market and only fr-FR translates it, so the
 * rows carry
 * a group code and the labels are a separate map.
 *
 * Two of live's defects are not carried. Its picker lists Switzerland and Turkey twice with
 * identical data,
 * and the sheet folds the pair. Its method logos carry a literal alt="null", and this has no
 * logos: the
 * method name is the text.
 */

import { labelsFor } from './field-labels.js';

/**
 * The groups a country offers.
 *
 * @param {{countries: {code: string, groups: object[]}[]}} data the sheet
 * @param {string} code an ISO country code
 * @returns {{group: string, methods: string}[]} empty where the sheet has no such country
 */
export const groupsFor = (data, code) => {
  if (!code) return [];
  const found = (data?.countries || []).find((one) => one.code === code);
  return found ? found.groups : [];
};

/**
 * The label for a group code, in the sheet's language.
 *
 * @param {{labels: Record<string, string>}} data the sheet
 * @param {string} group a group code
 * @returns {string} the code itself where the sheet names no label
 */
export const labelFor = (data, group) => (data?.labels || {})[group] || group;

/**
 * The countries for the picker, by name.
 *
 * @param {{countries: {code: string, name: string}[]}} data the sheet
 * @returns {{code: string, name: string}[]}
 */
export const countryOptions = (data) => [...(data?.countries || [])]
  .map((one) => ({ code: one.code, name: one.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const render = (widget, data, code) => {
  const results = widget.querySelector('.payment-methods-results');
  if (!results) return;
  const groups = groupsFor(data, code);
  results.replaceChildren();
  if (!groups.length) return;
  const list = document.createElement('dl');
  list.className = 'payment-methods-groups';
  groups.forEach((one) => {
    const term = document.createElement('dt');
    term.textContent = labelFor(data, one.group);
    const detail = document.createElement('dd');
    detail.textContent = one.methods;
    list.append(term, detail);
  });
  results.append(list);
};

/**
 * Builds the picker and its results.
 *
 * @param {Element} widget the widget block
 */
export default async function decorate(widget) {
  const base = new URL(`${window.hlx.codeBasePath}/widgets/`, window.location);
  const resp = await fetch(new URL('payment-methods.json', base));
  if (!resp.ok) throw new Error(`${resp.status} for the payment-methods sheet`);
  const data = await resp.json();

  const label = widget.querySelector('.payment-methods-label');
  const select = widget.querySelector('.payment-methods-country');
  if (!select) return;

  // The shell is authored in English and the estate serves ten languages, so the country field
  // takes live's own word for it. The placeholder option takes the same word, because live has no
  // prompt copy in the other nine languages.
  const words = labelsFor(document.documentElement.lang);
  if (label) label.textContent = words.country;
  const prompt = select.querySelector('option[value=""]');
  if (prompt) prompt.textContent = words.country;

  // The label is authored in the html shell, so the select is named by it rather than by an aria-
  // label.
  if (label && !label.htmlFor) {
    select.id = select.id || 'payment-methods-country';
    label.htmlFor = select.id;
  }

  countryOptions(data).forEach((one) => {
    const option = document.createElement('option');
    option.value = one.code;
    option.textContent = one.name;
    select.append(option);
  });
  select.addEventListener('change', () => render(widget, data, select.value));
}
