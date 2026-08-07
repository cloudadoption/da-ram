/**
 * The Royal Air Maroc office for a country and city, rebuilt on a sheet.
 *
 * Two of live's controls filter the same 68 offices: the call-centre number filter on
 * contact-us, which decision 0038 rebuilds, and the agency picker on
 * worldwide-agencies, which 0039 rebuilds. So one widget serves both and the show
 * parameter on the authored link decides which fields it renders:
 *
 *   /widgets/office-finder.html?show=phone     the call-centre filter
 *   /widgets/office-finder.html?show=address   the agency picker
 *
 * live holds the set in its contact-us page as a JavaScript array literal and every
 * market serves the same bytes, so one read was the sheet for all ten.
 *
 * The addresses and titles are French on every market, which is on the client register.
 * Carried as authored under decision 0041.
 */

import { labelsFor } from './field-labels.js';

const FIELDS = ['phone', 'address'];

/**
 * The distinct countries, by name.
 *
 * @param {{offices: {country: string}[]}} data the sheet
 * @returns {string[]}
 */
export const countriesIn = (data) => [...new Set((data?.offices || [])
  .map((one) => one.country))].sort((a, b) => a.localeCompare(b));

/**
 * The cities of one country, by name.
 *
 * @param {{offices: {country: string, city: string}[]}} data the sheet
 * @param {string} country a country name
 * @returns {string[]}
 */
export const citiesIn = (data, country) => {
  if (!country) return [];
  return [...new Set((data?.offices || [])
    .filter((one) => one.country === country)
    .map((one) => one.city))].sort((a, b) => a.localeCompare(b));
};

/**
 * The offices matching a country and, where one is named, a city.
 *
 * @param {{offices: object[]}} data the sheet
 * @param {string} country a country name
 * @param {string} city a city name, or empty for every city of the country
 * @returns {object[]}
 */
export const officesIn = (data, country, city) => {
  if (!country) return [];
  return (data?.offices || [])
    .filter((one) => one.country === country && (!city || one.city === city));
};

/**
 * Which fields to render, from the show parameter.
 *
 * @param {string} show a comma-separated list, or empty for both
 * @returns {string[]} in the sheet's own order, so a field the sheet lacks is dropped
 */
export const fieldsFor = (show) => {
  const asked = String(show || '').split(',').map((one) => one.trim()).filter(Boolean);
  if (!asked.length) return [...FIELDS];
  return FIELDS.filter((one) => asked.includes(one));
};

const renderOffices = (results, offices, fields) => {
  results.replaceChildren();
  if (!offices.length) return;
  const list = document.createElement('ul');
  list.className = 'office-finder-list';
  offices.forEach((office) => {
    const item = document.createElement('li');
    const name = document.createElement('h3');
    name.className = 'office-finder-city';
    name.textContent = office.city;
    item.append(name);
    fields.forEach((field) => {
      if (!office[field]) return;
      const line = document.createElement('p');
      line.className = `office-finder-${field}`;
      // The value can hold a newline, from a <br> live authored between two numbers or
      // above the opening hours. white-space: pre-line in the css keeps it.
      line.textContent = office[field];
      item.append(line);
    });
    list.append(item);
  });
  results.append(list);
};

/**
 * Builds the two pickers and the results.
 *
 * @param {Element} widget the widget block
 */
export default async function decorate(widget) {
  const base = new URL(`${window.hlx.codeBasePath}/widgets/`, window.location);
  const resp = await fetch(new URL('office-finder.json', base));
  if (!resp.ok) throw new Error(`${resp.status} for the office-finder sheet`);
  const data = await resp.json();

  const country = widget.querySelector('.office-finder-country');
  const city = widget.querySelector('.office-finder-city-select');
  const results = widget.querySelector('.office-finder-results');
  if (!country || !city || !results) return;

  const fields = fieldsFor(widget.dataset.show);

  // live labelled these fields in each market's own language and the shell is authored in English,
  // so a page that read Arabic before the rebuild would read Country after it. Only the label is
  // named: live's own control is a label over an empty input with no prompt text, so a prompt would
  // be copy we invented in nine languages.
  const words = labelsFor(document.documentElement.lang);
  const nameField = (selector, word) => {
    const label = widget.querySelector(selector);
    if (label) label.textContent = word;
  };
  nameField('label[for="office-finder-country"]', words.country);
  nameField('label[for="office-finder-city"]', words.city);

  countriesIn(data).forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    country.append(option);
  });

  // The city picker is disabled until a country is chosen, because its options come from one.
  const fillCities = () => {
    const cities = citiesIn(data, country.value);
    city.replaceChildren();
    const prompt = document.createElement('option');
    prompt.value = '';
    prompt.textContent = '';
    city.append(prompt);
    cities.forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      city.append(option);
    });
    city.disabled = !cities.length;
  };

  country.addEventListener('change', () => {
    fillCities();
    renderOffices(results, officesIn(data, country.value, ''), fields);
  });
  city.addEventListener('change', () => {
    renderOffices(results, officesIn(data, country.value, city.value), fields);
  });
  fillCities();
}
