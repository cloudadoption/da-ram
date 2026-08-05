import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const fonts = readFileSync(new URL('../styles/fonts.css', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles/styles.css', import.meta.url), 'utf8');

const facesIn = (css) => [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((match) => match[1]);
const valueOf = (face, property) => {
  const found = new RegExp(`${property}\\s*:\\s*([^;]+)`).exec(face);
  return found ? found[1].trim() : null;
};

const ARABIC_FAMILY = 'ram-arabic-font';
const FALLBACK = 'ram-primary-font-fallback';
const BLOCKS = ['U+0600', 'U+0750', 'U+08A0', 'U+FB50', 'U+FE70'];

// Measured over 323 Arabic strings from six served ar-sa pages, at the size and weight each one
// renders at, Cairo against the Arial that draws Arabic today. Median ratio 1.209 / 1.216 / 1.327
// / 1.390. The shipped value is the one nearest that median which sits on the re-wrap floor,
// which takes the elements that change line count on swap from 71 of 347 to 18 at 412px.
const ADJUST = {
  300: '123%', 400: '118%', 500: '131%', 700: '144%',
};
const WEIGHTS = Object.keys(ADJUST);

describe('the Arabic brand face', () => {
  const arabic = facesIn(fonts).filter((face) => valueOf(face, 'font-family') === ARABIC_FAMILY);

  it('declares one variable face over the weights the estate renders', () => {
    assert.equal(arabic.length, 1, `expected one ${ARABIC_FAMILY} face, found ${arabic.length}`);
    assert.equal(valueOf(arabic[0], 'font-weight'), '300 700');
  });

  it('is vendored, so no third-party origin serves it', () => {
    assert.equal(arabic.length, 1);
    const src = valueOf(arabic[0], 'src');
    assert.match(src, /\.\.\/fonts\/cairo\/cairo-arabic\.woff2/);
    assert.doesNotMatch(src, /https?:\/\//);
  });

  it('is ranged to Arabic, so a Latin page never fetches it', () => {
    assert.equal(arabic.length, 1);
    const range = valueOf(arabic[0], 'unicode-range');
    assert.ok(range, 'the Arabic face must declare a unicode-range');
    BLOCKS.forEach((block) => assert.ok(range.includes(block), `${block} missing from ${range}`));
    assert.doesNotMatch(range, /U\+0000/, 'the Arabic face must not claim the Latin range');
  });

  it('swaps like the other brand faces', () => {
    assert.equal(arabic.length, 1);
    assert.equal(valueOf(arabic[0], 'font-display'), 'swap');
  });

  it('sits between the brand family and the local fallback in every family token', () => {
    ['body', 'heading', 'secondary'].forEach((token) => {
      const found = new RegExp(`--${token}-font-family:\\s*([^;]+)`).exec(styles);
      assert.ok(found, `--${token}-font-family is missing`);
      const names = found[1].split(',').map((name) => name.trim());
      assert.deepEqual(
        [names.indexOf(ARABIC_FAMILY) > names.indexOf('ram-primary-font'),
          names.indexOf(ARABIC_FAMILY) < names.indexOf(FALLBACK)],
        [true, true],
        `--${token}-font-family orders the families wrong: ${found[1]}`,
      );
    });
  });
});

describe('the Arabic fallback', () => {
  const isArabic = (face) => /U\+0600/i.test(valueOf(face, 'unicode-range') || '');
  const arabicFallback = facesIn(styles)
    .filter((face) => valueOf(face, 'font-family') === FALLBACK)
    .filter(isArabic);

  it('carries the measured size-adjust for every weight the estate renders', () => {
    const found = {};
    arabicFallback.forEach((face) => {
      found[valueOf(face, 'font-weight')] = valueOf(face, 'size-adjust');
    });
    assert.deepEqual(found, ADJUST);
  });

  it('is not the Latin adjust, which was calibrated against a font with no Arabic', () => {
    const latin = facesIn(styles)
      .filter((face) => valueOf(face, 'font-family') === FALLBACK)
      .filter((face) => !isArabic(face))
      .map((face) => valueOf(face, 'size-adjust'));
    WEIGHTS.forEach((weight) => {
      assert.ok(!latin.includes(ADJUST[weight]), `weight ${weight} reuses a Latin adjust`);
    });
  });

  it('still resolves to a local face, so nothing is requested before the swap', () => {
    assert.equal(arabicFallback.length, WEIGHTS.length);
    arabicFallback.forEach((face) => assert.match(valueOf(face, 'src'), /^local\('Arial'\)$/));
  });
});

// Google's own unicode-range for the Cairo arabic subset claims Arabic Supplement and Extended-A, and the
// file maps neither: 0 codepoints in U+0750-077F and 0 in U+08A0-08FF, read with fontTools. Declaring them
// makes a character in those blocks download 30,712 bytes and then fall through anyway. The Arial fallback
// faces in styles.css keep the wider range, so such a character still gets its size-adjust.
describe('the Cairo unicode-range', () => {
  const face = fonts.slice(fonts.indexOf('font-family: ram-arabic-font'));
  const range = /unicode-range:\s*([^;]+);/.exec(face)[1];

  it('claims only the blocks the file maps', () => {
    assert.ok(!range.includes('U+0750'), 'Arabic Supplement is not in the file');
    assert.ok(!range.includes('U+08A0'), 'Arabic Extended-A is not in the file');
  });

  it('claims each block the file does map', () => {
    assert.match(range, /U\+0600-06FF/);
    assert.match(range, /U\+FB50-FDFF/);
    assert.match(range, /U\+FE70-FEFF/);
  });
});
