import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildTable } from '../blocks/table/table.js';

// A row is a div of cell divs, which is what the authored block gives.
const rows = (grid) => grid.map((cells) => ({
  children: cells.map((html) => ({ innerHTML: html })),
}));

describe('buildTable', () => {
  it('reads the first row as a header when there is more than one row', () => {
    const table = buildTable(rows([['Country', 'Code'], ['Kenya', 'KR']]));
    assert.deepEqual(table.head, [{ tag: 'th', html: 'Country' }, { tag: 'th', html: 'Code' }]);
    assert.deepEqual(table.body, [[{ tag: 'td', html: 'Kenya' }, { tag: 'td', html: 'KR' }]]);
  });

  // 8 of the 186 table blocks in the en-GB and ar-SA estates hold one row. Making
  // that row a header would leave the table with no body.
  it('leaves a single row in the body', () => {
    const table = buildTable(rows([['23kg', 'one piece']]));
    assert.deepEqual(table.head, []);
    assert.deepEqual(table.body, [[{ tag: 'td', html: '23kg' }, { tag: 'td', html: 'one piece' }]]);
  });

  // 8 of the 186 are ragged: a row narrower than the header. The row keeps the cells
  // it has rather than being padded to the widest.
  it('keeps a row that is narrower than the header', () => {
    const table = buildTable(rows([['A', 'B', 'C'], ['one', 'two']]));
    assert.equal(table.head.length, 3);
    assert.deepEqual(table.body[0].map((cell) => cell.html), ['one', 'two']);
  });

  it('keeps the markup inside a cell, so a link survives', () => {
    const table = buildTable(rows([['Airline'], ['<a href="/en-gb/iberia">Iberia</a>']]));
    assert.equal(table.body[0][0].html, '<a href="/en-gb/iberia">Iberia</a>');
  });

  it('drops a row with no cells', () => {
    const table = buildTable([...rows([['A', 'B']]), { children: [] }, ...rows([['x', 'y']])]);
    assert.equal(table.body.length, 1);
    assert.deepEqual(table.body[0].map((cell) => cell.html), ['x', 'y']);
  });

  it('returns nothing to build for an empty block', () => {
    const table = buildTable([]);
    assert.deepEqual(table, { head: [], body: [] });
  });
});
