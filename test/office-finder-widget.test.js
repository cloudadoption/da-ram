import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  citiesIn, countriesIn, fieldsFor, officesIn,
} from '../widgets/office-finder.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const data = JSON.parse(read('../widgets/office-finder.json'));

// live holds this set in its contact-us page as a JavaScript array literal, and every market serves the
// same bytes. So one read is the sheet for all ten. Two of live's controls filter it: the call-centre
// number filter on contact-us and the agency picker on worldwide-agencies. One widget serves both, and the
// show parameter on the authored link decides which fields it renders.
describe('the sheet', () => {
  it('holds live\'s 68 offices', () => {
    assert.equal(data.offices.length, 68);
  });

  it('gives each office a country, a city and a title', () => {
    data.offices.forEach((one) => {
      assert.ok(one.country, 'an office has no country');
      assert.ok(one.city, `${one.country} has an office with no city`);
      assert.ok(typeof one.title === 'string', `${one.city} has no title`);
    });
  });

  // live leaves three offices with no phone at all: Lome, Douala and Yaounde.
  it('keeps the three offices live gives no phone', () => {
    const without = data.offices.filter((one) => !one.phone).map((one) => one.city).sort();
    assert.deepEqual(without, ['Douala', 'Lome', 'Yaounde']);
  });
});

describe('countriesIn', () => {
  it('gives the distinct countries, by name', () => {
    const found = countriesIn(data);
    assert.equal(found.length, 45);
    assert.deepEqual(found, [...found].sort((a, b) => a.localeCompare(b)));
  });

  it('is empty for no sheet', () => {
    assert.deepEqual(countriesIn(null), []);
  });
});

describe('citiesIn', () => {
  it('gives the cities of one country', () => {
    assert.ok(citiesIn(data, 'Morocco').length > 1);
  });

  it('gives them by name', () => {
    const found = citiesIn(data, 'Morocco');
    assert.deepEqual(found, [...found].sort((a, b) => a.localeCompare(b)));
  });

  it('is empty for a country the sheet does not hold', () => {
    assert.deepEqual(citiesIn(data, 'Atlantis'), []);
  });

  it('is empty for no country', () => {
    assert.deepEqual(citiesIn(data, ''), []);
  });
});

describe('officesIn', () => {
  it('gives every office of a country when no city is named', () => {
    const found = officesIn(data, 'Morocco', '');
    assert.equal(found.length, citiesIn(data, 'Morocco').length);
  });

  it('narrows to one city', () => {
    const city = citiesIn(data, 'Morocco')[0];
    const found = officesIn(data, 'Morocco', city);
    assert.ok(found.length >= 1);
    found.forEach((one) => assert.equal(one.city, city));
  });

  it('is empty with no country', () => {
    assert.deepEqual(officesIn(data, '', ''), []);
  });
});

describe('fieldsFor', () => {
  // The call-centre filter shows the number; the agency picker shows where the office is.
  it('shows the phone alone for the call-centre filter', () => {
    assert.deepEqual(fieldsFor('phone'), ['phone']);
  });

  it('shows the address alone for the agency picker', () => {
    assert.deepEqual(fieldsFor('address'), ['address']);
  });

  it('shows both where the link asks for both', () => {
    assert.deepEqual(fieldsFor('phone,address'), ['phone', 'address']);
  });

  it('shows both where the link asks for nothing', () => {
    assert.deepEqual(fieldsFor(''), ['phone', 'address']);
    assert.deepEqual(fieldsFor(undefined), ['phone', 'address']);
  });

  it('passes over a field the sheet does not hold', () => {
    assert.deepEqual(fieldsFor('phone,nosuchfield'), ['phone']);
  });
});
