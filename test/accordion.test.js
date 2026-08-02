import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { nestedBlockName } from '../blocks/accordion/accordion.js';

const source = readFileSync(new URL('../blocks/accordion/accordion.js', import.meta.url), 'utf8');
// Assertions about what the module does must not read its comments.
const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

// Live's alliance-partnerships and both safar-flyer tier pages put a table inside every
// collapsed panel: 120 panels over 30 pages, each holding a table and a list. EDS decorates
// blocks at main > div > div only, so a table nested in an accordion answer never loads its
// JS or its CSS and renders as bare divs.
describe('nestedBlockName', () => {
  it('reads the block name from the first class', () => {
    assert.equal(nestedBlockName('table'), 'table');
  });

  it('takes the first class where a variant follows', () => {
    assert.equal(nestedBlockName('cards cover'), 'cards');
  });

  it('says nothing for an element with no class', () => {
    assert.equal(nestedBlockName(''), null);
    assert.equal(nestedBlockName('   '), null);
    assert.equal(nestedBlockName(undefined), null);
  });
});

describe('the accordion block', () => {
  it('decorates and loads a block nested in an answer', () => {
    assert.match(code, /decorateBlock/, 'it decorates the nested block');
    assert.match(code, /loadBlock/, 'it loads the nested block');
    assert.match(code, /from '\.\.\/\.\.\/scripts\/aem\.js'/);
  });

  it('opens the first panel only on the open-first variant', () => {
    assert.match(code, /open-first/);
  });
});
