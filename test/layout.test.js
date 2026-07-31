import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const styles = readFileSync(new URL('../styles/styles.css', import.meta.url), 'utf8');

// The live content column caps at 1240px, confirmed twice over: a 22-point
// viewport sweep of the container element, and the rendered width of a body
// paragraph on en-gb/checked-baggage, which reads 1240px at both 1280 and 1440.
// The boilerplate capped at 1200px.
//
// Below the cap the live container takes 90% of the viewport rather than a fixed
// inset. The sweep reads 288 at 320, 810 at 900 and 1080 at 1200, which is 90%
// throughout.
describe('content column', () => {
  it('caps at the measured 1240px', () => {
    assert.match(styles, /--content-max-width:\s*1240px/);
    assert.doesNotMatch(styles, /max-width:\s*1200px/);
  });

  it('takes 90% of the viewport below the cap, not a fixed padding', () => {
    assert.match(styles, /--content-width:\s*90%/);
  });

  it('applies both to the section container', () => {
    const section = /main > \.section > div \{[^}]*\}/.exec(styles);
    assert.ok(section, 'the section container rule is still there');
    assert.match(section[0], /width:\s*var\(--content-width\)/);
    assert.match(section[0], /max-width:\s*var\(--content-max-width\)/);
  });

  // A fixed 24px inset and a 90% width are different rules. Keeping both would
  // narrow the column twice.
  it('drops the fixed horizontal padding the boilerplate used', () => {
    const section = /main > \.section > div \{[^}]*\}/.exec(styles);
    assert.doesNotMatch(section[0], /padding:\s*0 24px/);
  });
});
