/**
 * The country and city field labels, per language.
 *
 * Both rebuilt controls filter by country and city, and live labelled those fields in each
 * market's own language. Its worldwide-agencies page carried three paragraphs, the country
 * label, the city label and a confirm button, and the migration replaced them with the widget.
 * So these are live's own words, read off the ten pages before they were replaced. Nothing here
 * is translated by us, and there is no prompt copy at all: live's own control is a label over an
 * empty input, so a "Select a country" would be copy we invented in nine languages.
 *
 * The key is the language rather than the market, because that is what the page carries:
 * applyLocale sets html lang from the served value and the estate has one language per market.
 */
export const LABELS = {
  ar: { country: 'البلد', city: 'المدينة' },
  de: { country: 'Land', city: 'Stadt' },
  en: { country: 'Country', city: 'City' },
  es: { country: 'País', city: 'Ciudad' },
  fr: { country: 'Pays', city: 'Ville' },
  it: { country: 'Paese', city: 'Città' },
  nl: { country: 'Land', city: 'Plaats' },
  pt: { country: 'País', city: 'Cidade' },
  ru: { country: 'Страна', city: 'Город' },
  tr: { country: 'Ülke', city: 'Şehir' },
};

/**
 * The labels for a page's language.
 *
 * @param {string} lang an html lang value, with or without a region
 * @returns {{country: string, city: string}} live's words, English where the language is unknown
 */
export function labelsFor(lang) {
  const language = String(lang || '').toLowerCase().split('-')[0];
  return LABELS[language] || LABELS.en;
}
