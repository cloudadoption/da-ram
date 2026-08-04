import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import decorate, { buildTable } from '../blocks/table/table.js';

// A row is a div of cell divs, which is what the authored block gives. The cells
// are returned as themselves, so decorate can move their nodes rather than copy
// their markup, and a label stands in for a cell in these assertions.
const rows = (grid) => grid.map((cells) => ({
  children: cells.map((label) => ({ label })),
}));
const labels = (cells) => cells.map((cell) => cell.label);

describe('buildTable', () => {
  it('reads the first row as a header when there is more than one row', () => {
    const table = buildTable(rows([['Country', 'Code'], ['Kenya', 'KR']]));
    assert.deepEqual(labels(table.head), ['Country', 'Code']);
    assert.deepEqual(table.body.map(labels), [['Kenya', 'KR']]);
  });

  // 8 of the 186 table blocks in the en-GB and ar-SA estates hold one row. Making
  // that row a header would leave the table with no body.
  it('leaves a single row in the body', () => {
    const table = buildTable(rows([['23kg', 'one piece']]));
    assert.deepEqual(table.head, []);
    assert.deepEqual(table.body.map(labels), [['23kg', 'one piece']]);
  });

  // 8 more are ragged: a row narrower than the header. The row keeps the cells it
  // has rather than being padded to the widest.
  it('keeps a row that is narrower than the header', () => {
    const table = buildTable(rows([['A', 'B', 'C'], ['one', 'two']]));
    assert.equal(table.head.length, 3);
    assert.deepEqual(labels(table.body[0]), ['one', 'two']);
  });

  it('drops a row with no cells', () => {
    const table = buildTable([...rows([['A', 'B']]), { children: [] }, ...rows([['x', 'y']])]);
    assert.equal(table.body.length, 1);
    assert.deepEqual(labels(table.body[0]), ['x', 'y']);
  });

  it('returns nothing to build for an empty block', () => {
    assert.deepEqual(buildTable([]), { head: [], body: [] });
  });

  it('returns the cell elements themselves, so their nodes can move', () => {
    const grid = rows([['Country'], ['Kenya']]);
    assert.equal(buildTable(grid).head[0], grid[0].children[0]);
    assert.equal(buildTable(grid).body[0][0], grid[1].children[0]);
  });
});

// Live's table header is the client's own --ram-background-positive-color,
// #a22032, with white text at weight 400. Measured on checked-baggage in English
// and German: head cell padding 8px 12px 8px 15px, body cell border #dee2e6.
// The boilerplate drew a grey #f7f7f7 header with dark bold text.
describe('the table head', () => {
  const styles = readFileSync(new URL('../blocks/table/table.css', import.meta.url), 'utf8');
  const rootStyles = readFileSync(new URL('../styles/styles.css', import.meta.url), 'utf8');
  const declarations = styles.replace(/\/\*[\s\S]*?\*\//g, '');
  const head = /\.table thead th \{[\s\S]*?\n\}/.exec(declarations)[0];

  it('names the client token rather than the hex', () => {
    assert.match(head, /background-color:\s*var\(--ram-background-positive-color\)/);
    assert.match(rootStyles, /--ram-background-positive-color:\s*#a22032/);
  });

  it('puts white text on it at the measured weight', () => {
    assert.match(head, /color:\s*#fff/);
    assert.match(head, /font-weight:\s*400/);
  });

  it('gives a row the measured border rather than the body colour', () => {
    const cell = /\.table th,\n\.table td \{[\s\S]*?\n\}/.exec(declarations)[0];
    assert.match(cell, /border-block-end:\s*1px solid #dee2e6/);
    assert.doesNotMatch(cell, /var\(--dark-color\)/);
  });
});

// Live's cell padding is 8px 12px 8px 15px at 375, 900 and 1440 alike, so the
// boilerplate's 600px step from 8px 12px to 12px 16px has nothing behind it.
describe('the table cell padding', () => {
  const styles = readFileSync(new URL('../blocks/table/table.css', import.meta.url), 'utf8');
  const declarations = styles.replace(/\/\*[\s\S]*?\*\//g, '');

  it('takes the measured padding', () => {
    const cell = /\.table th,\n\.table td \{[\s\S]*?\n\}/.exec(declarations)[0];
    assert.match(cell, /padding:\s*8px 12px 8px 15px/);
  });

  it('does not step at 600px, because live does not', () => {
    assert.doesNotMatch(declarations, /@media \(width >= 600px\)/);
  });
});

// decorate is what puts the header association in the DOM, and nothing tested it. Live's own
// association is broken: each data cell of the fare tables carries headers="dataHeader-$id"
// unrendered, 3,362 occurrences over 100 captured pages, pointing at an id no element has. The
// migrated estate carries none of it, because the block rebuilds the table from the authored
// cells. So scope="col" on a th inside a thead is what a screen reader has to go on.
//
// A minimal document, because the repository has no DOM. An element records its tag, its
// attributes and the nodes appended to it, which is what decorate touches.
const element = (tagName) => {
  const node = {
    tagName,
    attributes: {},
    children: [],
    childNodes: [],
    setAttribute(name, value) { this.attributes[name] = value; },
    append(...nodes) { this.children.push(...nodes); this.childNodes.push(...nodes); },
    replaceChildren(...nodes) { this.children = [...nodes]; this.childNodes = [...nodes]; },
  };
  return node;
};
const cell = (text) => ({ ...element('div'), childNodes: [text] });
const row = (cells) => ({
  ...element('div'),
  children: cells.map(cell),
});
const block = (grid) => ({
  ...element('div'),
  children: grid.map(row),
});

describe('decorate', () => {
  const rendered = (grid) => {
    global.document = { createElement: element };
    const target = block(grid);
    decorate(target);
    return target.children[0];
  };

  it('builds a thead whose cells are th with scope col', () => {
    const table = rendered([['Country', 'Code'], ['Kenya', 'KR']]);
    const [thead, tbody] = table.children;
    assert.equal(thead.tagName, 'thead');
    assert.equal(tbody.tagName, 'tbody');
    const heads = thead.children[0].children;
    assert.deepEqual(heads.map((th) => th.tagName), ['th', 'th']);
    assert.deepEqual(heads.map((th) => th.attributes.scope), ['col', 'col']);
  });

  it('builds body rows of td, which carry no scope', () => {
    const table = rendered([['Country', 'Code'], ['Kenya', 'KR']]);
    const [, tbody] = table.children;
    const cells = tbody.children[0].children;
    assert.deepEqual(cells.map((td) => td.tagName), ['td', 'td']);
    assert.equal(cells[0].attributes.scope, undefined);
  });

  // buildTable puts a lone row in the body, so the table has content rather than a header with
  // nothing under it. The DOM has to agree: no thead.
  it('gives a single row no thead', () => {
    const table = rendered([['Kenya', 'KR']]);
    assert.deepEqual(table.children.map((part) => part.tagName), ['tbody']);
  });

  it('moves the authored nodes into the cell rather than copying them', () => {
    const table = rendered([['Country', 'Code'], ['Kenya', 'KR']]);
    const cells = table.children[1].children[0].children;
    assert.deepEqual(cells.map((td) => td.children), [['Kenya'], ['KR']]);
  });
});

// Text inside a cell reads the paragraph rule rather than the cell's own. Measured at 1440 over
// eight table pages in four markets on 2026-08-04:
//
//   live, bare text in a cell        16px / 24px / 400   6 of the 8 pages
//   live, a paragraph in a cell      16px / 25.6px / 400 /en-gb/airport-transit, de-DE sibling
//   ours, always a paragraph         16px / 22.4px / 300 every page, 4 to 65 per page
//
// The cell itself already matches at 16px / 24px / 400 on both sides. What differs is the wrapper:
// the transform emits a p where live often has bare text, and the global paragraph rule then wins
// inside the cell, taking the leading from 24px to 22.4px and the weight from 400 to 300.
//
// Letting the cell own both matches live's bare-text case exactly and lands 1.6px off its
// paragraph case, which is the smaller population. 599 of 1,860 generated documents carry a table
// block, so this is the type of the tabular copy across a third of the estate.
describe('a paragraph inside a cell takes the cell’s type', () => {
  const css = readFileSync(new URL('../blocks/table/table.css', import.meta.url), 'utf8');
  const declared = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = /(?:^|\n)\.table (?:th|td) p[^{]*\{[\s\S]*?\n\}/.exec(declared);

  it('has a rule for it', () => {
    assert.ok(rule, 'expected a rule for a paragraph inside a cell');
  });

  it('takes the cell’s leading rather than the paragraph rule’s', () => {
    assert.match(rule[0], /line-height:\s*inherit/);
  });

  it('takes the cell’s weight, which is the visible half of the difference', () => {
    assert.match(rule[0], /font-weight:\s*inherit/);
  });
});
