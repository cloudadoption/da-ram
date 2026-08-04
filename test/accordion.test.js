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

// Live declares the accordion in /o/ram-airways-theme/2025/css/styles.css, read on 2026-08-04:
//
//   .accordion__item{border-block-end:.0625rem solid var(--ram-neutral-200-color)}
//   .accordion__button{padding-block:.75rem}
//   .accordion__title{margin-inline-start:.25rem;color:var(--ram-text-dark-color)}
//   .accordion__content{flex-direction:column;padding-block:.5rem;padding-inline:.25rem}
//   .accordion__chevron{margin-inline-end:.25rem;color:var(--ram-text-dark-color)}
//   .accordion__button.active .accordion__chevron{transform:rotate(180deg)}
//
// Measured against ours on /en-gb/faq-version-02, 46 items on each side: live's rule is #ebeae8 and
// ours #e0e0e0, live's button padding-block 12px and ours 16px, the title weight 400 and ours 500,
// the title inset 4px and ours 0, the panel 8px/4px and ours 0 0 16px. Live's marker is a 20x20
// chevron in #1a1717 with a 4px trailing margin, and ours a 24px plus in the brand red.
describe('the accordion follows live-s own rule', () => {
  const css = read('../blocks/accordion/accordion.css');
  const rootStyles = read('../styles/styles.css');
  const declared = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector) => {
    const at = declared.indexOf(selector);
    assert.ok(at >= 0, `expected a rule for ${selector}`);
    return declared.slice(at, declared.indexOf('}', at) + 1);
  };

  it('rules an item with the client-s own neutral token', () => {
    assert.match(rule('.accordion details'), /border-block-end:\s*1px solid var\(--ram-neutral-200-color\)/);
    assert.match(rootStyles, /--ram-neutral-200-color:\s*#ebeae8/);
  });

  it('takes the declared button padding and the measured weight', () => {
    const summary = rule('.accordion summary');
    assert.match(summary, /padding-block:\s*12px/);
    assert.match(summary, /font-weight:\s*400/);
  });

  // Live's h3 title reads 16px on 22.4px, body leading. The summary took the page's 1.5 and drew a
  // 50px row against live's 46.
  it('gives the question body leading, as live-s title has', () => {
    assert.match(rule('.accordion summary'), /line-height:\s*1\.4/);
  });

  it('insets the question, as the title rule does', () => {
    assert.match(rule('.accordion summary'), /padding-inline-start:\s*4px/);
  });

  it('takes the declared panel padding', () => {
    const answer = rule('.accordion .accordion-answer');
    assert.match(answer, /padding-block:\s*8px/);
    assert.match(answer, /padding-inline:\s*4px/);
  });

  // The client's ram-icons font is not loaded here, so the chevron is drawn rather than set: a
  // square with two edges, turned 45deg one way while the panel is closed and the other while open.
  it('draws a chevron rather than a plus', () => {
    const marker = rule('.accordion summary::after');
    assert.doesNotMatch(marker, /content:\s*'\+'/);
    assert.match(marker, /transform:\s*rotate/);
    assert.match(marker, /var\(--ram-text-dark-color\)/);
    assert.match(declared, /details\[open\] summary::after \{[^}]*transform:\s*rotate/);
  });
});
