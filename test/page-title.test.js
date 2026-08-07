import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const styles = readFileSync(new URL('../styles/styles.css', import.meta.url), 'utf8');

// Two page-title shapes on live's 2025 theme, and the theme's own h1 is neither.
//
// `body.titled main h1` already carries live's page-heading component: 24px on 32px, stepping to
// 40px on 44px at 992, in the secondary family at weight 400.
//
// `ram-holidays-faq` and `children-and-pregnancy/children` are different. Read at 375, 768, 992
// and 1440 on 2026-08-07: live draws an h1 in the primary family at a flat 40px on 48px, weight
// 500, #1a1717, and ours reads 32px on 38.4px with the same family, weight and colour. So only the
// size and the leading differ, and they do not step. 20 documents, ten markets each, and
// `theme: page-title-40` on each becomes the body class.
//
// The `holidays` family is not in this set. Live titles it as an h2 in the secondary family at
// rgb(230, 238, 250) on a dark banner, which is the white-on-a-banner class the heading-colour
// tokens leave out on purpose: a white rule with no banner puts white text on a white page.
describe('the flat 40px page title', () => {
  it('sets the size and the leading', () => {
    assert.match(styles, /body\.page-title-40 main h1 \{[^}]*font-size:\s*40px/);
    assert.match(styles, /body\.page-title-40 main h1 \{[^}]*line-height:\s*48px/);
  });

  it('sets neither the family nor the weight, because both already agree', () => {
    const rule = /body\.page-title-40 main h1 \{([^}]*)\}/.exec(styles);
    assert.ok(rule, 'the rule is declared');
    assert.doesNotMatch(rule[1], /font-family/);
    assert.doesNotMatch(rule[1], /font-weight/);
    assert.doesNotMatch(rule[1], /color/);
  });

  // A document carrying both would otherwise depend on source order. The flat rule comes after the
  // titled step so it wins, and no document carries both today.
  it('comes after the titled step, so it wins where a document carries both', () => {
    const titled = styles.lastIndexOf('body.titled main h1');
    const flat = styles.indexOf('body.page-title-40 main h1');
    assert.ok(flat > titled, 'the flat rule is declared after the titled one');
  });

  it('does not step at a breakpoint, because live does not', () => {
    const at = styles.indexOf('body.page-title-40 main h1');
    const after = styles.slice(at, at + 400);
    assert.doesNotMatch(after, /@media[^{]*\{\s*body\.page-title-40/);
  });
});
