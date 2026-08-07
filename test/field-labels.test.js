import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LABELS, labelsFor } from '../widgets/field-labels.js';

// The words come from live's own worldwide-agencies page in each market, where the dead form's
// three paragraphs were the country and city labels. Nothing here is translated by us.
describe('labelsFor', () => {
  it('gives the Arabic words for ar', () => {
    assert.deepEqual(labelsFor('ar'), { country: 'البلد', city: 'المدينة' });
  });

  it('gives the Russian words for ru', () => {
    assert.deepEqual(labelsFor('ru'), { country: 'Страна', city: 'Город' });
  });

  it('reads a region tag as its language', () => {
    assert.deepEqual(labelsFor('pt-PT'), { country: 'País', city: 'Cidade' });
  });

  it('folds case', () => {
    assert.deepEqual(labelsFor('TR'), { country: 'Ülke', city: 'Şehir' });
  });

  it('falls back to English for a language the estate does not serve', () => {
    assert.deepEqual(labelsFor('ja'), { country: 'Country', city: 'City' });
  });

  it('falls back to English for nothing', () => {
    assert.deepEqual(labelsFor(''), { country: 'Country', city: 'City' });
    assert.deepEqual(labelsFor(undefined), { country: 'Country', city: 'City' });
  });

  it('covers the ten languages the estate serves', () => {
    const served = ['ar', 'de', 'en', 'es', 'fr', 'it', 'nl', 'pt', 'ru', 'tr'];
    assert.deepEqual(Object.keys(LABELS).sort(), served);
  });

  it('gives a country and a city word for each', () => {
    Object.entries(LABELS).forEach(([lang, words]) => {
      assert.ok(words.country, `${lang} has no country word`);
      assert.ok(words.city, `${lang} has no city word`);
    });
  });

  it('shares a country word across two pairs of languages', () => {
    // de and nl both read Land, es and pt both read País, so ten languages give eight words.
    const countries = Object.values(LABELS).map((one) => one.country);
    assert.equal(countries.length, 10);
    assert.equal(new Set(countries).size, 8);
  });
});
