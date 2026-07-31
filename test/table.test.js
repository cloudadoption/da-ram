import assert from 'node:assert/strict';
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
