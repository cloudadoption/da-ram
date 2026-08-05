import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../styles/styles.css', import.meta.url), 'utf8');

const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((match) => match[1]);
const valueOf = (face, property) => {
  const found = new RegExp(`${property}\\s*:\\s*([^;]+)`).exec(face);
  return found ? found[1].trim() : null;
};

const FALLBACK = 'ram-primary-font-fallback';
const fallbackFaces = faces.filter((face) => valueOf(face, 'font-family') === FALLBACK);
const isArabic = (face) => /U\+0600/i.test(valueOf(face, 'unicode-range') || '');

test('the fallback family declares a face for every weight the estate renders', () => {
  const weights = fallbackFaces.map((face) => valueOf(face, 'font-weight')).filter(Boolean);
  assert.deepEqual([...new Set(weights)].sort(), ['300', '400', '500', '700']);
});

test('a size-adjusted fallback face is ranged to one script', () => {
  // A ratio is calibrated against the face that swaps in, and there are two: Museo Sans over the
  // Latin ranges and Cairo over the Arabic ones. Applied to the wrong script the value inflates
  // text nothing is going to swap, which is what the Latin adjust did to Arabic before the Arabic
  // faces took a value of their own: 213.75px against a nominal 205.95px, 3.79% wider.
  const adjusted = fallbackFaces.filter((face) => valueOf(face, 'size-adjust'));
  assert.ok(adjusted.length, 'expected at least one size-adjusted fallback face');
  adjusted.forEach((face) => {
    const range = valueOf(face, 'unicode-range');
    assert.ok(range, 'a size-adjusted face must declare a unicode-range');
    const latin = /U\+0000/i.test(range);
    assert.notEqual(latin, isArabic(face), `a face must not claim both scripts: ${range}`);
  });
});

test('the Latin and Arabic adjusts share no value, being measured against different fonts', () => {
  const adjustsFor = (arabic) => fallbackFaces
    .filter((face) => isArabic(face) === arabic)
    .map((face) => valueOf(face, 'size-adjust'));
  const latin = adjustsFor(false);
  adjustsFor(true).forEach((value) => {
    assert.ok(value, 'every Arabic face must carry its own size-adjust');
    assert.ok(!latin.includes(value), `${value} is a Latin adjust on an Arabic face`);
  });
});

test('every weight the estate renders has a face on both sides of the range split', () => {
  const weightsWhere = (arabic) => new Set(fallbackFaces
    .filter((face) => isArabic(face) === arabic)
    .map((face) => valueOf(face, 'font-weight')));
  const latin = weightsWhere(false);
  const arabic = weightsWhere(true);
  assert.deepEqual([...latin].sort(), [...arabic].sort());
});

test('the Arabic faces cover the ranges a shaped Arabic run reaches', () => {
  const arabic = fallbackFaces.filter(isArabic);
  assert.ok(arabic.length, 'expected Arabic-range fallback faces');
  // Arabic, Arabic Supplement, Extended-A, and the two presentation-forms blocks.
  const blocks = ['U+0600', 'U+0750', 'U+08A0', 'U+FB50', 'U+FE70'];
  arabic.forEach((face) => {
    const range = valueOf(face, 'unicode-range');
    blocks.forEach((block) => assert.ok(range.includes(block), `${block} missing from ${range}`));
  });
});
