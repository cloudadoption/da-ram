import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../styles/styles.css', import.meta.url), 'utf8');

// Every @font-face block in the file, as text.
const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((match) => match[1]);
const valueOf = (face, property) => {
  const found = new RegExp(`${property}\\s*:\\s*([^;]+)`).exec(face);
  return found ? found[1].trim() : null;
};

const fallbackFaces = faces.filter((face) => valueOf(face, 'font-family') === 'ram-primary-font-fallback');

test('the fallback family declares a face for every weight the estate renders', () => {
  const weights = fallbackFaces.map((face) => valueOf(face, 'font-weight')).filter(Boolean);
  assert.deepEqual([...new Set(weights)].sort(), ['300', '400', '500', '700']);
});

test('a size-adjusted fallback face is restricted away from Arabic', () => {
  // size-adjust on this family is calibrated from Latin strings comparing Museo Sans against Arial.
  // Museo Sans carries no Arabic, so no swap happens there and the adjust only inflates the text:
  // measured at 213.75px against a nominal 205.95px, 3.79% wider, on a 32px weight-500 Arabic string.
  const adjusted = fallbackFaces.filter((face) => valueOf(face, 'size-adjust'));
  assert.ok(adjusted.length, 'expected at least one size-adjusted fallback face');
  for (const face of adjusted) {
    const range = valueOf(face, 'unicode-range');
    assert.ok(range, 'a size-adjusted face must declare a unicode-range that excludes Arabic');
    assert.ok(!/0[6-8][0-9A-F]{2}/i.test(range), `a size-adjusted face must not cover Arabic: ${range}`);
  }
});

test('every weight that has a size-adjusted face also has an unadjusted Arabic face', () => {
  const adjustedWeights = new Set(fallbackFaces
    .filter((face) => valueOf(face, 'size-adjust'))
    .map((face) => valueOf(face, 'font-weight')));
  const arabicWeights = new Set(fallbackFaces
    .filter((face) => !valueOf(face, 'size-adjust') && /U\+0600/i.test(valueOf(face, 'unicode-range') || ''))
    .map((face) => valueOf(face, 'font-weight')));
  for (const weight of adjustedWeights) {
    assert.ok(arabicWeights.has(weight), `weight ${weight} has no unadjusted Arabic face`);
  }
});

test('the Arabic faces cover the ranges the estate actually uses', () => {
  const arabic = fallbackFaces.filter((face) => /U\+0600/i.test(valueOf(face, 'unicode-range') || ''));
  assert.ok(arabic.length, 'expected Arabic-range fallback faces');
  for (const face of arabic) {
    const range = valueOf(face, 'unicode-range');
    // Arabic, Arabic Supplement, Extended-A, and the two presentation-forms blocks a shaped
    // Arabic run reaches.
    for (const block of ['U+0600', 'U+0750', 'U+08A0', 'U+FB50', 'U+FE70']) {
      assert.ok(range.includes(block), `${block} missing from ${range}`);
    }
  }
});
