import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const head = readFileSync(new URL('../head.html', import.meta.url), 'utf8');
const scripts = readFileSync(new URL('../scripts/scripts.js', import.meta.url), 'utf8');

// The CSP came from aem-boilerplate #641, "Harden CSP protection with Trusted Types". On this
// estate `require-trusted-types-for 'script'` stopped 12 of the 21 HubSpot forms from rendering,
// and those forms are the whole content of their pages: the baggage claim, the refund request,
// the irregularity report, the settlement acceptance and the promotion signups.
//
// HubSpot's forms/embed/v2.js sets `src` on a script element with a plain string, which the
// directive refuses: `Failed to set the 'src' property on 'HTMLScriptElement': This document
// requires 'TrustedScriptURL' assignment.` scripts.js does create a default policy whose
// createScriptURL returns its input, and the assignment is refused anyway, so the policy is not
// reached from wherever v2.js makes it. Measured on /en-gb/bagage-perdu: the iframe is 150px with
// the directive and 472px with Page.setBypassCSP, against an authored height of 502.
//
// The nonce and strict-dynamic stay. What goes is the Trusted Types requirement.
describe('the content security policy', () => {
  it('does not require Trusted Types, which stops the HubSpot forms rendering', () => {
    assert.ok(!head.includes('require-trusted-types-for'));
  });

  it('keeps the nonce and strict-dynamic, which is the part that restricts a script', () => {
    assert.match(head, /script-src[^"]*'nonce-aem'/);
    assert.match(head, /script-src[^"]*'strict-dynamic'/);
  });

  it('keeps base-uri', () => {
    assert.ok(head.includes("base-uri 'self'"));
  });

  it('keeps object-src and frame-src', () => {
    assert.ok(head.includes("object-src 'none'"));
    assert.ok(head.includes("frame-src 'self' https:"));
  });

  // Left in place on purpose. Nothing requires Trusted Types now, so the policy is inert, and it
  // is what makes the site work if a CSP ever asks for them again.
  it('keeps the default Trusted Types policy in scripts.js', () => {
    assert.match(scripts, /createPolicy\('default'/);
    assert.match(scripts, /createScriptURL/);
  });
});
