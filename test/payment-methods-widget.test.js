import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { countryOptions, groupsFor, labelFor } from '../widgets/payment-methods.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const data = JSON.parse(read('../widgets/payment-methods.json'));

// live keeps this data inside a Liferay portlet and answers one country at a time. The sheet was read
// from fr-FR, whose method set per country matches every market: only the group label differs, and only
// fr-FR translates it. So the rows carry a group code and the labels are a separate map, which lets a
// market's labels change without touching the rows.
describe('the sheet', () => {
  it('holds a row per country live offers', () => {
    assert.equal(data.countries.length, 50);
  });

  it('gives each country a code, a name and its groups', () => {
    for (const one of data.countries) {
      assert.match(one.code, /^[A-Z]{2}$/);
      assert.ok(one.name, `${one.code} has no name`);
      assert.ok(Array.isArray(one.groups), `${one.code} has no groups`);
    }
  });

  it('gives each country at least one group, because live does', () => {
    for (const one of data.countries) assert.ok(one.groups.length > 0, `${one.code} has no group`);
  });

  it('uses a group code the label map knows', () => {
    for (const one of data.countries) {
      for (const group of one.groups) {
        assert.ok(data.labels[group.group], `${group.group} has no label`);
      }
    }
  });

  it('names Morocco and France, the two live serves most methods for', () => {
    const codes = data.countries.map((one) => one.code);
    assert.ok(codes.includes('MA'));
    assert.ok(codes.includes('FR'));
  });

  // live lists Switzerland and Turkey twice with identical data, which is a defect on the register. The
  // sheet folds the pair, so a visitor sees each country once.
  it('lists each country once, where live lists CH and TR twice', () => {
    const codes = data.countries.map((one) => one.code);
    assert.equal(new Set(codes).size, codes.length);
  });
});

describe('groupsFor', () => {
  it('gives the groups of the country asked for', () => {
    const found = groupsFor(data, 'AO');
    assert.deepEqual(found.map((one) => one.group), ['cards']);
    assert.match(found[0].methods, /Visa/);
  });

  it('gives more than one group where the country has more', () => {
    assert.ok(groupsFor(data, 'FR').length > 1);
  });

  it('is empty for a country the sheet does not hold', () => {
    assert.deepEqual(groupsFor(data, 'ZZ'), []);
  });

  it('is empty for no code', () => {
    assert.deepEqual(groupsFor(data, ''), []);
    assert.deepEqual(groupsFor(data, null), []);
  });
});

describe('labelFor', () => {
  it('gives the label of a group code', () => {
    assert.equal(typeof labelFor(data, 'cards'), 'string');
    assert.ok(labelFor(data, 'cards').length > 0);
  });

  it('falls back to the code where no label is set', () => {
    assert.equal(labelFor(data, 'nosuchgroup'), 'nosuchgroup');
  });
});

describe('countryOptions', () => {
  it('gives the countries sorted by name, for the picker', () => {
    const options = countryOptions(data);
    assert.equal(options.length, 50);
    const names = options.map((one) => one.name);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  });
});
