import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
// Assertions about what a module does must not read its comments.
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const accordion = strip(read('../blocks/accordion/accordion.js'));
const tabs = strip(read('../blocks/tabs/tabs.js'));
const bareTables = strip(read('../scripts/bare-tables.js'));

// Live's alliance-partnerships, general-terms-and-conditions and reduced-mobility families put a
// table inside a collapsed panel: 30 documents. The transform used to write it as a nested
// div.table and the pipeline flattened it to a run of paragraphs, so the delivered answer read
// "Country Code Airline Airline Sénégal HC Air Senegal" down the page. Probed on
// main--da-ram--cloudadoption: a div block inside a cell is flattened, a real table and a list
// survive intact.
//
// So the document carries a real table there, and the wrapper the table block's stylesheet needs
// is rebuilt here. table.css is loaded rather than copied, or the two would drift.
describe('a bare table inside a panel', () => {
  it('is wrapped so the table block stylesheet applies', () => {
    assert.match(bareTables, /createElement\('div'\)/);
    assert.match(bareTables, /'table'/);
  });

  it('loads the table block stylesheet rather than restating its rules', () => {
    assert.match(bareTables, /loadCSS/);
    assert.match(bareTables, /\/blocks\/table\/table\.css/);
  });

  it('leaves a table the block already wraps alone', () => {
    assert.match(bareTables, /closest\('\.table'\)/);
  });

  it('is handled by both blocks that hold panels', () => {
    assert.match(accordion, /styleBareTables/);
    assert.match(tabs, /styleBareTables/);
  });
});

// The pipeline cannot deliver a block inside a block, so decorating one in the browser was
// reaching for something that never arrives.
describe('the accordion block', () => {
  it('does not try to decorate a nested block', () => {
    assert.doesNotMatch(accordion, /decorateBlock/);
    assert.doesNotMatch(accordion, /nested-blocks/);
  });

  it('opens the first panel only on the open-first variant', () => {
    assert.match(accordion, /open-first/);
  });
});
