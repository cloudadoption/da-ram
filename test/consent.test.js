import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

// adobe/aem-boilerplate#653 retires delayed.js and the setTimeout that carried
// it, and gates the delayed phase behind a consent check instead. Announced by
// David Nuescheler on 2026-07-31. RAM serves a consent banner on live, so the
// migrated site needs a real CMP at cutover and this is the shape it plugs into.
describe('the delayed phase is gated on consent', () => {
  const scripts = readFileSync(new URL('../scripts/scripts.js', import.meta.url), 'utf8');

  it('imports the consent check rather than delayed.js', () => {
    const rule = /function loadDelayed\(\) \{[\s\S]*?\n\}/.exec(scripts)[0];
    assert.match(rule, /import\('\.\/consent-check\.js'\)/);
    assert.doesNotMatch(rule, /delayed\.js/);
  });

  it('drops the three second timer, which was the point of the change', () => {
    const rule = /function loadDelayed\(\) \{[\s\S]*?\n\}/.exec(scripts)[0];
    assert.doesNotMatch(rule, /setTimeout/);
  });

  it('no longer ships delayed.js', () => {
    assert.equal(existsSync(new URL('../scripts/delayed.js', import.meta.url)), false);
  });

  it('ships the consent check and the file it gates', () => {
    assert.ok(existsSync(new URL('../scripts/consent-check.js', import.meta.url)));
    assert.ok(existsSync(new URL('../scripts/consented.js', import.meta.url)));
  });

  // Decision 0030, Ben on 2026-08-01: no CMP for the POC and consent is granted.
  // The gate wraps nothing today, because consented.js is a comment and nothing
  // listens for consent.update, so the default changes no behaviour. It removes a
  // trap: the next thing added to consented.js would silently never run under a
  // declining default.
  it('grants consent by default for the POC', () => {
    const check = readFileSync(new URL('../scripts/consent-check.js', import.meta.url), 'utf8');
    const rule = /function hasConsent\(\) \{[\s\S]*?\n\}/.exec(check)[0];
    assert.match(rule, /return true;/);
    assert.doesNotMatch(rule, /return false;/);
  });

  it('still lets a query parameter decline, so the gate can be exercised', () => {
    const check = readFileSync(new URL('../scripts/consent-check.js', import.meta.url), 'utf8');
    assert.match(check, /consent=decline|'decline'/);
    assert.match(check, /consent\.update/);
  });

  // A site that grants consent by default is not lawful in the EU once it loads
  // tracking, so the file has to say out loud that this is the POC default and
  // what has to happen before cutover.
  it('says in the file that a real CMP is pre-cutover work', () => {
    const check = readFileSync(new URL('../scripts/consent-check.js', import.meta.url), 'utf8');
    assert.match(check, /0030/);
    assert.match(check, /cutover/i);
  });
});
