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

// The cap does not arrive by 90% reaching 1240, which would need a 1378px
// viewport. Live switches at exactly 1280: the column reads 1053px at 1200,
// 1089px at 1240 and 1107px at 1260, then jumps to 1240px at 1280 and holds
// there at 1320 and 1440.
describe('the container breakpoint', () => {
  it('fixes the column at the cap from 1280 up', () => {
    const query = /@media \(width >= 1280px\) \{[^@]*?\}\s*\}/.exec(styles);
    assert.ok(query, 'expected a 1280px media query');
    assert.match(query[0], /width:\s*var\(--content-max-width\)/);
  });

  it('names the breakpoint as a token', () => {
    assert.match(styles, /--content-cap-breakpoint:\s*1280px/);
  });
});

// Below the breakpoint the live column is 27px narrower than 90% of the
// viewport, at 375 and at 768 alike: 311 against 338, and 664 against 691. A
// constant difference at two widths is a fixed inset, not a proportional one.
// Above the breakpoint there is none, since the column matches the cap exactly.
describe('the inner inset', () => {
  it('insets the column by the measured 13.5px each side below the breakpoint', () => {
    const section = /main > \.section > div \{[^}]*\}/.exec(styles);
    assert.match(section[0], /padding-inline:\s*13\.5px/);
  });

  it('uses a logical property, so it mirrors under rtl', () => {
    const section = /main > \.section > div \{[^}]*\}/.exec(styles);
    assert.doesNotMatch(section[0], /padding-(left|right):/);
  });

  it('drops the inset above the breakpoint, where the column matches the cap', () => {
    const query = /@media \(width >= 1280px\) \{[^@]*?\}\s*\}/.exec(styles);
    assert.match(query[0], /padding-inline:\s*0/);
  });
});
