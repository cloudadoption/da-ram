import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { buildTable } from '../blocks/table/table.js';

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
