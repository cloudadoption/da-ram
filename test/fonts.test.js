import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const fonts = readFileSync(new URL('../styles/fonts.css', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../styles/styles.css', import.meta.url), 'utf8');
const head = readFileSync(new URL('../head.html', import.meta.url), 'utf8');

const FONT_ORIGIN = 'https://www.royalairmaroc.com/o/ram-airways-theme/2025/assets/fonts';

// Ben's ruling: until the migration cuts over, the brand fonts are served from
// the current domain rather than copied here. Museo Sans and Museo are
// commercial exljbris typefaces, so hosting a copy needs a licence covering this
// host and that answer is not in yet.
//
// It works because royalairmaroc.com answers access-control-allow-origin: * on
// the font files, verified with and without an Origin header. Proven end to end
// on a migrated page: the face loads, document.fonts.check passes, and the
// rendered width of a paragraph moves from 706.47px to 672.14px.
describe('brand fonts', () => {
  it('loads every weight from the live origin', () => {
    ['100', '300', '500', '700'].forEach((weight) => {
      assert.match(fonts, new RegExp(`${FONT_ORIGIN}/museosans_${weight}-webfont\\.woff2`));
    });
  });

  it('names the family the live theme names, so the token is the client tone', () => {
    assert.match(fonts, /font-family: ram-primary-font/);
    assert.match(fonts, /font-family: ram-secondary-font/);
  });

  // The live theme sets no unicode-range on any face, so Museo Sans is offered
  // for every script and the browser falls back per glyph. A Latin-only range
  // would change which glyphs the brand font draws on the Arabic, Russian and
  // Turkish estates.
  it('sets no unicode-range, matching the live theme', () => {
    // The property, not the word: the file explains itself in a comment.
    assert.doesNotMatch(fonts, /^\s*unicode-range:/m);
  });

  it('keeps font-display swap on every face, as the live theme does', () => {
    const faces = fonts.match(/@font-face\s*\{[^}]*\}/g) || [];
    assert.ok(faces.length >= 8, `expected the four weights of two families, found ${faces.length}`);
    faces
      .filter((face) => !face.includes('src: local('))
      .forEach((face) => assert.match(face, /font-display:\s*swap/));
  });

  it('drops the roboto faces the boilerplate shipped', () => {
    assert.doesNotMatch(fonts, /roboto-(regular|bold|medium|condensed)/);
  });

  it('points the family tokens at the brand fonts', () => {
    assert.match(styles, /--body-font-family:\s*ram-primary-font/);
    assert.match(styles, /--heading-font-family:\s*ram-primary-font/);
  });

  // A third-party origin in the font path costs a DNS lookup and a TLS
  // handshake before the first glyph. A preconnect pays that down while the page
  // is still parsing.
  it('preconnects to the font origin', () => {
    assert.match(head, /rel="preconnect"[^>]*https:\/\/www\.royalairmaroc\.com/);
  });

  it('keeps a size-adjusted local fallback so the swap does not reflow', () => {
    assert.match(styles, /font-family: ram-primary-font-fallback/);
    assert.match(styles, /size-adjust:/);
  });
});
