import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SAME_AS, structuredDataFor } from '../scripts/structured-data.js';

// www.royalairmaroc.com emits two JSON-LD blocks on each of its ten market home pages, WebSite and
// Airline, and this estate emitted none. Measured 2026-08-03 over all ten:
// evidence/render/live-structured-data.json in the control plane.
//
// The per-market values are the local office. de-DE carries 5 Rossmarkt in Frankfurt and
// +49 698 679 81 61, fr-FR 38, Avenue de l'Opéra in Paris. en-GB and ar-SA carry the same keys with
// every value empty, which is live's own defect and is reproduced rather than filled in.

const DE = {
  market: 'de-de',
  alternateName: 'Royal Air Maroc - GERMANY',
  street: '5 Rossmarkt',
  locality: 'Frankfurt',
  postalCode: '60311',
  country: 'DE',
  telephone: '+49 698 679 81 61',
  currency: 'EUR',
};

describe('structuredDataFor', () => {
  it('returns the WebSite block first and the Airline block second', () => {
    const [website, airline] = structuredDataFor(DE);
    assert.equal(website['@type'], 'WebSite');
    assert.equal(airline['@type'], 'Airline');
  });

  it('names the market root as the url on both blocks', () => {
    const [website, airline] = structuredDataFor(DE);
    assert.equal(website.url, 'https://www.royalairmaroc.com/de-de');
    assert.equal(airline.url, 'https://www.royalairmaroc.com/de-de');
    assert.equal(website.publisher.url, 'https://www.royalairmaroc.com/de-de');
  });

  it('carries the per-market office and contact', () => {
    const [, airline] = structuredDataFor(DE);
    assert.equal(airline.address.streetAddress, '5 Rossmarkt');
    assert.equal(airline.address.addressLocality, 'Frankfurt');
    assert.equal(airline.address.postalCode, '60311');
    assert.equal(airline.address.addressCountry, 'DE');
    assert.equal(airline.contactPoint.telephone, '+49 698 679 81 61');
    assert.equal(airline.contactPoint.areaServed, 'DE');
    assert.equal(airline.offers.priceCurrency, 'EUR');
    assert.equal(airline.offers.eligibleRegion.name, 'DE');
  });

  it('carries the constants: the iata code, the logo and the social profiles', () => {
    const [, airline] = structuredDataFor(DE);
    assert.equal(airline.name, 'Royal Air Maroc');
    assert.equal(airline.alternateName, 'RAM');
    assert.equal(airline.iataCode, 'AT');
    assert.equal(airline.logo['@type'], 'ImageObject');
    assert.deepEqual(airline.sameAs, SAME_AS);
    assert.equal(SAME_AS.length, 4);
  });

  // en-GB and ar-SA are like this on live. Filling them in would invent an address
  // for a market whose office the client has not named, and decision 0023 reproduces
  // a poor live value rather than improving it.
  it('keeps an empty field empty rather than dropping the key', () => {
    const [website, airline] = structuredDataFor({
      market: 'en-gb',
      alternateName: 'Royal Air Maroc - INTERNATIONAL',
      street: '',
      locality: '',
      postalCode: '',
      country: '',
      telephone: '',
      currency: '',
    });
    assert.equal(website.alternateName, 'Royal Air Maroc - INTERNATIONAL');
    assert.equal(airline.address.addressCountry, '');
    assert.equal(airline.contactPoint.telephone, '');
    assert.equal(airline.offers.priceCurrency, '');
    assert.equal('addressCountry' in airline.address, true);
  });

  it('returns nothing for a path that is not a market root', () => {
    assert.deepEqual(structuredDataFor({ market: '' }), []);
    assert.deepEqual(structuredDataFor({}), []);
  });

  // A JSON-LD block that does not parse is worse than none: a crawler reads it and drops the page's
  // markup. The estate has one apostrophe to worry about, in 38, Avenue de l'Opéra.
  it('produces JSON that round-trips, apostrophe and all', () => {
    const blocks = structuredDataFor({
      market: 'fr-fr',
      alternateName: 'Royal Air Maroc - FRANCE',
      street: "38, Avenue de l'Opéra",
      locality: 'Paris',
      postalCode: '75002',
      country: 'FR',
      telephone: '+33820 821 821',
      currency: 'EUR',
    });
    blocks.forEach((block) => {
      assert.deepEqual(JSON.parse(JSON.stringify(block)), block);
    });
    assert.equal(blocks[1].address.streetAddress, "38, Avenue de l'Opéra");
  });
});
