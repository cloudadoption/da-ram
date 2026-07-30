import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LOCALES, applyLocale, localeForPath } from '../scripts/locale.js';

const element = (attributes = {}) => ({ lang: '', dir: '', ...attributes });

describe('localeForPath', () => {
  it('reads the locale off the first path segment', () => {
    assert.deepEqual(localeForPath('/en-gb/about-us'), { lang: 'en', dir: 'ltr' });
    assert.deepEqual(localeForPath('/ar-sa/baggage'), { lang: 'ar', dir: 'rtl' });
    assert.deepEqual(localeForPath('/de-de/gepaeck'), { lang: 'de', dir: 'ltr' });
  });

  it('covers the ten languages the estate declares', () => {
    const declared = ['ar-sa', 'de-de', 'en-gb', 'es-es', 'fr-fr', 'it-it', 'nl-nl', 'pt-pt', 'ru-ru', 'tr-tr'];
    assert.deepEqual(Object.keys(LOCALES).sort(), declared);
  });

  it('names ar-sa as the one right-to-left locale', () => {
    const rtl = Object.entries(LOCALES).filter(([, value]) => value.dir === 'rtl');
    assert.deepEqual(rtl.map(([key]) => key), ['ar-sa']);
  });

  it('matches a mixed-case prefix, because the language matters more than the casing', () => {
    assert.deepEqual(localeForPath('/AR-SA/baggage'), { lang: 'ar', dir: 'rtl' });
  });

  it('returns null for a path with no locale prefix', () => {
    assert.equal(localeForPath('/about-us'), null);
    assert.equal(localeForPath('/'), null);
    assert.equal(localeForPath(''), null);
  });
});

describe('applyLocale', () => {
  it('supplies the language when the served markup declares none', () => {
    const html = element();
    applyLocale(html, '/de-de/gepaeck');
    assert.equal(html.lang, 'de');
    assert.equal(html.dir, 'ltr');
  });

  it('leaves a server-set language alone rather than overwriting it', () => {
    const html = element({ lang: 'fr' });
    applyLocale(html, '/en-gb/about-us');
    assert.equal(html.lang, 'fr');
  });

  it('sets dir from the language the document actually declares', () => {
    const html = element({ lang: 'ar' });
    applyLocale(html, '/about-us');
    assert.equal(html.dir, 'rtl');
  });

  it('reads a regional tag down to its base subtag', () => {
    const html = element({ lang: 'ar-SA' });
    applyLocale(html, '/about-us');
    assert.equal(html.dir, 'rtl');
  });

  it('falls back to English when neither the markup nor the path says', () => {
    const html = element();
    applyLocale(html, '/about-us');
    assert.equal(html.lang, 'en');
    assert.equal(html.dir, 'ltr');
  });

  it('ignores whitespace in a served lang attribute', () => {
    const html = element({ lang: '  ' });
    applyLocale(html, '/ru-ru/o-nas');
    assert.equal(html.lang, 'ru');
  });
});
