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

  it('declines by default, so nothing loads until a CMP says otherwise', () => {
    const check = readFileSync(new URL('../scripts/consent-check.js', import.meta.url), 'utf8');
    assert.match(check, /return false/);
    assert.match(check, /consent\.update/);
  });
});
