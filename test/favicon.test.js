import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const head = readFileSync(new URL('../head.html', import.meta.url), 'utf8');

const LIVE_FAVICON = 'https://www.royalairmaroc.com/documents/31824/0/favicon.ico'
  + '/a24318ac-7ec0-3c0f-581d-930009528883';

// www.royalairmaroc.com declares rel="icon" and rel="apple-touch-icon", both
// pointing at the same 1,150-byte ICO. This estate declared neither, so a browser
// fell back to probing /favicon.ico and got the one this repository inherited from
// aem-boilerplate at commit 783231b, "chore: reduce to the max". Every tab on a
// Royal Air Maroc site showed Adobe's icon.
//
// The URL points at the live origin for the reason decision 0026 gives for the brand fonts and the
// header logo: they are the client's licensed assets and this repository is public, so nothing is
// vendored until cutover settles the licence.
describe('the favicon', () => {
  it('declares rel="icon" at the live origin', () => {
    assert.match(head, /<link[^>]*rel="icon"[^>]*>/);
    assert.ok(head.includes(LIVE_FAVICON));
  });

  it('declares rel="apple-touch-icon" too, which live does and which has no working default', () => {
    assert.match(head, /<link[^>]*rel="apple-touch-icon"[^>]*>/);
  });

  it('ships no favicon of its own, so nothing serves another brand by default', () => {
    assert.equal(existsSync(new URL('../favicon.ico', import.meta.url)), false);
  });
});
