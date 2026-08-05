import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isExternalHref, markExternalLinks } from '../scripts/external-links.js';

const HOST = 'main--da-ram--cloudadoption.aem.live';

describe('isExternalHref', () => {
  it('reads another host as external', () => {
    assert.equal(isExternalHref('https://www.qatarairways.com/', HOST), true);
    assert.equal(isExternalHref('https://www.cdc.gov/travel', HOST), true);
  });

  // upgrade.royalairmaroc.com is the client's own subdomain and a separate platform under
  // stakeholder-scope's excluded list, so a visitor going there is leaving this site.
  it('reads a client subdomain as external', () => {
    assert.equal(isExternalHref('https://upgrade.royalairmaroc.com/', HOST), true);
  });

  it('reads our own host and a rooted path as internal', () => {
    assert.equal(isExternalHref(`https://${HOST}/en-gb/checked-baggage`, HOST), false);
    assert.equal(isExternalHref('/en-gb/checked-baggage', HOST), false);
  });

  // Live writes target="_blank" on 4,709 anchors with no href or only a fragment, and on 557 with the
  // _blanck misspelling. Resolving the href drops each of those classes without naming them.
  it('reads a fragment, an empty href and a non-http scheme as internal', () => {
    assert.equal(isExternalHref('#', HOST), false);
    assert.equal(isExternalHref('#earn', HOST), false);
    assert.equal(isExternalHref('', HOST), false);
    assert.equal(isExternalHref('mailto:silvergold@royalairmaroc.com', HOST), false);
    assert.equal(isExternalHref('tel:+212', HOST), false);
    assert.equal(isExternalHref('not a url at all', HOST), false);
  });
});

describe('markExternalLinks', () => {
  const anchor = (href) => {
    const attributes = new Map();
    return {
      href,
      getAttribute: (name) => (name === 'href' ? href : attributes.get(name) || null),
      setAttribute: (name, value) => attributes.set(name, value),
      attributes,
    };
  };

  it('sets target on an external link and leaves an internal one alone', () => {
    const external = anchor('https://www.qatarairways.com/');
    const internal = anchor('/en-gb/checked-baggage');
    markExternalLinks({ querySelectorAll: () => [external, internal] }, HOST);
    assert.equal(external.attributes.get('target'), '_blank');
    assert.equal(internal.attributes.get('target'), undefined);
  });

  // Live adds no rel on any of the 389, and a browser has implied noopener for target="_blank" since
  // 2021, so adding one would be a divergence with no behaviour behind it.
  it('adds no rel, because live adds none and the browser implies noopener', () => {
    const external = anchor('https://www.cdc.gov/');
    markExternalLinks({ querySelectorAll: () => [external] }, HOST);
    assert.equal(external.attributes.get('rel'), undefined);
  });

  it('does not overwrite a target somebody authored', () => {
    const external = anchor('https://www.cdc.gov/');
    external.attributes.set('target', '_self');
    markExternalLinks({ querySelectorAll: () => [external] }, HOST);
    assert.equal(external.attributes.get('target'), '_self');
  });
});
