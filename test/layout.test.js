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

// The padding widened the column instead of insetting it. The boilerplate sets
// box-sizing on buttons only, so the container is content-box: width 90% plus
// 13.5px each side makes the box 365px at a 375px viewport and leaves the
// paragraph at 338. border-box takes the inset out of the 90%.
describe('the container box model', () => {
  it('sets border-box on the section container', () => {
    const section = /main > \.section > div \{[^}]*\}/.exec(styles);
    assert.match(section[0], /box-sizing:\s*border-box/);
  });
});

// The type scale, measured on four live article pages at 375 and 1440 with
// tools/design/type-survey.mjs in the control plane. Live does not scale its
// article type at a breakpoint: the same values read at both widths. The
// boilerplate scale does move at 900px, which is the gap.
describe('the type scale', () => {
  const root = /:root\s*\{[\s\S]*?\n\}/.exec(styles)[0];
  const sizeOf = (name) => {
    const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(root);
    return match && match[1].trim();
  };

  it('sets the body size to the measured 16px', () => {
    assert.equal(sizeOf('body-font-size-m'), '16px');
  });

  // The copy line height moved onto `p, li`, where live authors it. See the body
  // copy weight tests for the pair.
  it('sets the copy line height to the measured 1.4', () => {
    const rule = /\np,\s*li\s*\{[\s\S]*?\n\}/.exec(styles)[0];
    assert.match(rule, /line-height:\s*1\.4\b/);
  });

  it('sets the page title to the measured 32px', () => {
    assert.equal(sizeOf('heading-font-size-xxl'), '32px');
  });

  // The transform promotes a live h2 to h1 on some pages and leaves it an h2 on
  // others, so both levels answer to live's 32px h2. reduced-mobility keeps the
  // h2 and read 28px against live's 32px until this.
  it('sets the top two heading levels to live\'s 32px h2', () => {
    assert.equal(sizeOf('heading-font-size-xxl'), '32px');
    assert.equal(sizeOf('heading-font-size-xl'), '32px');
  });

  it('sets the section heading to the measured 28px', () => {
    assert.equal(sizeOf('heading-font-size-l'), '28px');
  });

  it('sets the remaining heading levels to the measured 24, 20 and 16px', () => {
    assert.equal(sizeOf('heading-font-size-m'), '24px');
    assert.equal(sizeOf('heading-font-size-s'), '20px');
    assert.equal(sizeOf('heading-font-size-xs'), '16px');
  });

  it('gives headings the measured 1.2 line height', () => {
    const headings = /h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[\s\S]*?\n\}/.exec(styles)[0];
    assert.match(headings, /line-height:\s*1\.2\b/);
  });

  it('gives headings the measured 500 weight', () => {
    const headings = /h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[\s\S]*?\n\}/.exec(styles)[0];
    assert.match(headings, /font-weight:\s*500\b/);
  });

  it('does not restate a type size at the 900px breakpoint, because live is flat', () => {
    const wide = /@media\s*\(width\s*>=\s*900px\)\s*\{[\s\S]*?\n\}\n\}/.exec(styles);
    if (!wide) return;
    assert.doesNotMatch(wide[0], /--(body|heading)-font-size-/);
  });
});

// Live table cells read 16px on checked-baggage at 375 and 1440, the same as its
// body copy. The block inherited the boilerplate's 14px.
describe('the table block', () => {
  const table = readFileSync(new URL('../blocks/table/table.css', import.meta.url), 'utf8');

  it('sets table text to the measured body size', () => {
    assert.match(table, /font-size:\s*var\(--body-font-size-m\)/);
    assert.doesNotMatch(table, /font-size:\s*var\(--body-font-size-s\)/);
  });
});

// Live body copy is weight 300 at a 1.4 line height: 18 of 38 modal-paragraph
// readings across the survey pages, and every reading but four is 300. The body
// element itself computes 24px leading, which is 1.5, so the two differ.
describe('body copy weight', () => {
  it('sets paragraphs and list items to the measured 300', () => {
    const rule = /\np,\s*li\s*\{[\s\S]*?\n\}/.exec(styles);
    assert.ok(rule, 'expected a p, li rule');
    assert.match(rule[0], /font-weight:\s*300\b/);
    assert.match(rule[0], /line-height:\s*1\.4\b/);
  });

  it('leaves the body element at the measured 1.5', () => {
    const body = /\nbody\s*\{[\s\S]*?\n\}/.exec(styles)[0];
    assert.match(body, /line-height:\s*1\.5\b/);
  });
});

// The vertical rhythm, measured as the gap a reader sees rather than the
// declared margin, because adjacent margins collapse. On live article pages the
// run between two paragraphs is 8px (22 samples on reduced-mobility) and the gap
// under a heading is 15 to 24px across 14 samples on four pages. The migrated
// pages read 13px for both.
describe('the vertical rhythm', () => {
  // The top margin is the well-evidenced half: 0px on 61 of 64 live paragraphs
  // across six pages, and 12.8px on all 109 migrated ones with no exception. The
  // bottom is not a single value on live, 4px on 53% and 0px on 33%, so it keeps
  // the 4px plurality rather than chasing a per-page number.
  it('leaves no top margin on a block, as live does', () => {
    const rule = /\np,\ndl,\nol,\nul,\npre,\nblockquote\s*\{[\s\S]*?\n\}/.exec(styles);
    assert.ok(rule, 'expected the block-element margin rule');
    assert.match(rule[0], /margin-top:\s*0;/);
    assert.match(rule[0], /margin-bottom:\s*4px;/);
  });

  it('gives a heading the measured 20px below it', () => {
    const headings = /h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[\s\S]*?\n\}/.exec(styles)[0];
    assert.match(headings, /margin-bottom:\s*20px;/);
  });

  it('indents a list by the measured 20px, not the browser default 40', () => {
    const rule = /\nul,\nol\s*\{[\s\S]*?\n\}/.exec(styles);
    assert.ok(rule, 'expected a list rule');
    assert.match(rule[0], /padding-inline-start:\s*20px/);
  });
});

// 974 documents carry a title lifted from live's `.page-heading__title`
// component, flagged with `template: titled` metadata, which the boilerplate
// turns into a body class. Live styles that component differently from an
// article's own first heading: 24px/32px weight 400 in the secondary family
// below 992px, and 40px/44px above. Article headings do not move at all.
describe('the page title component', () => {
  const rule = () => /body\.titled\s+main\s+h1\s*\{[\s\S]*?\n\}/.exec(styles);

  it('styles the title in the secondary family', () => {
    assert.ok(rule(), 'expected a body.titled main h1 rule');
    assert.match(rule()[0], /font-family:\s*var\(--secondary-font-family\)/);
  });

  it('takes the measured 24px and weight 400 below the breakpoint', () => {
    assert.match(rule()[0], /font-size:\s*24px/);
    assert.match(rule()[0], /font-weight:\s*400/);
    assert.match(rule()[0], /line-height:\s*32px/);
  });

  it('rises to the measured 40px above 992px', () => {
    const wide = /@media\s*\(width\s*>=\s*992px\)\s*\{[\s\S]*?\n\s*\}\n\}/.exec(styles);
    assert.ok(wide, 'expected a 992px breakpoint block');
    assert.match(wide[0], /font-size:\s*40px/);
    assert.match(wide[0], /line-height:\s*44px/);
  });

  it('leaves an untitled page alone, so the article scale still applies', () => {
    const heading = /h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[\s\S]*?\n\}/.exec(styles)[0];
    assert.match(heading, /font-weight:\s*500/);
  });
});

// The colour of the first content heading on an untitled page is authored per
// page, not set by live's theme. Rendering all 515 untitled pages at 1440 gives
// #b02736 on 245, the default on 97, #212529 on 79, white on 54, black on 35 and
// #c2002f on 3, so a single rule cannot do it. 362 documents carry a `theme`
// metadata value, which the boilerplate turns into a body class.
describe('the authored heading colour', () => {
  const colourOf = (name) => {
    const rule = new RegExp(`body\\.${name}\\s+main\\s+h1\\s*\\{[^}]*\\}`).exec(styles);
    return rule && /color:\s*([^;]+);/.exec(rule[0])[1].trim();
  };

  it('carries the brand red that 245 pages use', () => {
    assert.equal(colourOf('heading-brand'), '#b02736');
  });

  it('carries the slate the legacy pages use', () => {
    assert.equal(colourOf('heading-slate'), '#212529');
  });

  it('carries plain black and the second red', () => {
    assert.equal(colourOf('heading-black'), '#000');
    assert.equal(colourOf('heading-crimson'), '#c2002f');
  });

  // Live reads white on a dark banner the migration has not reproduced, so a
  // white rule would put white text on a white page.
  it('has no white rule, which would make 54 headings invisible', () => {
    assert.doesNotMatch(styles, /body\.heading-(white|inverse)/);
  });
});

// Across 515 untitled live pages the first content heading is weight 500 on 59%
// and the headings under it are lighter: of 710 later 32px h2s, 400 are weight
// 300 and 303 are 500. The migrated document's h1 is live's first heading, so it
// keeps 500 and h2 takes the 300.
describe('the heading weights', () => {
  const headings = () => /h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*\{[\s\S]*?\n\}/.exec(styles)[0];

  it('keeps the 500 the first heading measures', () => {
    assert.match(headings(), /font-weight:\s*500/);
  });

  it('lightens h2 to the measured 300', () => {
    const rule = /\nh2\s*\{[\s\S]*?\n\}/.exec(styles);
    assert.ok(rule, 'expected an h2 rule');
    assert.match(rule[0], /font-weight:\s*300/);
  });

  it('leaves h3 and h4 at 500, which is what they measure', () => {
    assert.doesNotMatch(styles, /\nh3\s*\{[^}]*font-weight/);
    assert.doesNotMatch(styles, /\nh4\s*\{[^}]*font-weight/);
  });
});
