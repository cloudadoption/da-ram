import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

// Assertions about what a module does must not read its comments.
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const widget = strip(readFileSync(new URL('../blocks/widget/widget.js', import.meta.url), 'utf8'));

// The block is how a control gets rebuilt on Edge Delivery. scripts.js turns a link
// to /widgets/ into one, and the block fetches that name's html, css and js from the
// code bus. No widget is authored in the estate yet, and the register's largest open
// item is 16 control families to rebuild, keep or drop. So this runs first on a page
// somebody is authoring, where a thrown error costs the most.
describe('the widget block survives a block it cannot use', () => {
  it('reads the source link inside the try, not before it', () => {
    const decorate = /export default async function decorate\([\s\S]*$/.exec(widget);
    assert.ok(decorate, 'expected decorate');
    const beforeTry = decorate[0].slice(0, decorate[0].indexOf('try {'));
    assert.doesNotMatch(beforeTry, /querySelector/);
    assert.doesNotMatch(beforeTry, /new URL/);
  });

  it('gives up on a block with no link rather than throwing', () => {
    assert.match(widget, /if \(!source\)|source \?\?|source === null|!source\b/);
  });

  // A 404 answers with the site's own not-found page, and resp.text() hands it back as widget html.
  it('checks the response before it becomes innerHTML', () => {
    assert.match(widget, /resp\.ok|response\.ok|\.ok\b/);
  });
});
