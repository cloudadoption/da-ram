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
    assert.match(head, /color:\s*var\(--ram-text-inverse-color\)/);
    assert.match(rootStyles, /--ram-text-inverse-color:\s*#fff/);
    assert.match(head, /font-weight:\s*400/);
  });

  it('gives a row the measured border rather than the body colour', () => {
    const cell = /\.table th,\n\.table td \{[\s\S]*?\n\}/.exec(declarations)[0];
    assert.match(cell, /border-block:\s*1px solid #dee2e6/);
    assert.doesNotMatch(cell, /var\(--dark-color\)/);
  });

  // No top rule and a 2px one below, read on /en-gb/checked-baggage. The base cell rule now sets a
  // 1px rule on both edges, so the head says what it does not take.
  it('keeps the head free of a top rule', () => {
    assert.match(head, /border-block-start-width:\s*0/);
    assert.match(head, /border-block-end-width:\s*2px/);
  });
});

// The earlier reading, 8px 12px 8px 15px at 375, 900 and 1440 alike, was the first column of the
// row. Clay declares the base at .75rem and puts 15px on the outer edges:
//
//   table td{...padding:.75rem...}
//   table th:first-child,.table td:first-child{padding-left:15px}
//   table th:last-child,.table td:last-child{padding-right:15px}
//
// and the 2025 theme takes the vertical down to .5rem. So the flat rule matched live on the first
// cell of each row and was 3px out on the rest, in both directions.
describe('the table cell padding', () => {
  const styles = readFileSync(new URL('../blocks/table/table.css', import.meta.url), 'utf8');
  const declarations = styles.replace(/\/\*[\s\S]*?\*\//g, '');

  it('takes the base padding the 2025 theme declares', () => {
    const cell = /\.table th,\n\.table td \{[\s\S]*?\n\}/.exec(declarations)[0];
    assert.match(cell, /padding:\s*8px 12px;/);
  });

  it('puts 15px on the outer edge of each row, as Clay does', () => {
    assert.match(declarations, /:first-child \{[^}]*padding-inline-start:\s*15px/);
    assert.match(declarations, /:last-child \{[^}]*padding-inline-end:\s*15px/);
  });

  it('does not step at 600px, because live does not', () => {
    assert.doesNotMatch(declarations, /@media \(width >= 600px\)/);
  });
});

// The 2025 theme declares the whole cell in one rule, read on 2026-08-04 from
// /o/ram-airways-theme/2025/css/styles.css:
//
//   .table-responsive table th,.table-responsive table td{padding:.5rem .75rem;text-align:center;
//     vertical-align:middle;height:3.5rem}
//   .table-responsive table th:first-child,.table-responsive table td:first-child{text-align:start}
//   .table-responsive table td{background-color:var(--ram-background-default-color);
//     color:var(--ram-neutral-900-color)}
//   .table-responsive{...border-radius:.5rem}
//   .table-responsive.scroll-table table th:first-child,...td:first-child{position:sticky;
//     inset-inline-start:0;z-index:1}
//
// Every live table sampled is table.table.table-alternate-reverse inside
// div.table-responsive.scroll-table, so the whole set applies. Measured against ours on
// /en-gb/checked-baggage: row heights 56 66 89 89 against 45 70 93 93, cell background #fff against
// transparent, colour #333231 against #1a1717, a 1px top rule against none, an 8px corner against
// a square one, and the first column pinned against scrolling away.
describe('the table cell follows the 2025 theme rule', () => {
  const styles = readFileSync(new URL('../blocks/table/table.css', import.meta.url), 'utf8');
  const rootStyles = readFileSync(new URL('../styles/styles.css', import.meta.url), 'utf8');
  const declarations = styles.replace(/\/\*[\s\S]*?\*\//g, '');
  const cell = () => /\.table th,\n\.table td \{[\s\S]*?\n\}/.exec(declarations)[0];

  it('centres a cell and starts the first one', () => {
    assert.match(cell(), /text-align:\s*center/);
    assert.match(declarations, /:first-child \{[^}]*text-align:\s*start/);
  });

  it('sits the text in the middle of the cell rather than at the top', () => {
    assert.match(cell(), /vertical-align:\s*middle/);
    assert.doesNotMatch(cell(), /vertical-align:\s*top/);
  });

  it('takes the declared minimum row height', () => {
    assert.match(cell(), /height:\s*3\.5rem/);
  });

  // Live is border-box throughout and this repository is content-box, so the 56px floor added the
  // padding and the rules on top and drew a 73px header row against live's 56.
  it('counts the padding inside that height, as live does', () => {
    assert.match(cell(), /box-sizing:\s*border-box/);
  });

  it('gives a body cell the declared background and colour', () => {
    const body = /\n\.table tbody td \{[\s\S]*?\n\}/.exec(declarations);
    assert.ok(body, 'expected a rule for a body cell');
    assert.match(body[0], /background-color:\s*var\(--ram-background-default-color\)/);
    assert.match(body[0], /color:\s*var\(--ram-neutral-900-color\)/);
    assert.match(rootStyles, /--ram-neutral-900-color:\s*#333231/);
  });

  it('rules a cell above and below, and keeps the last row-s', () => {
    assert.match(cell(), /border-block:\s*1px solid #dee2e6/);
    assert.doesNotMatch(declarations, /tbody tr:last-child/);
  });

  it('rounds the corner of the scroll box', () => {
    const box = /\n\.table \{[\s\S]*?\n\}/.exec(declarations)[0];
    assert.match(box, /border-radius:\s*8px/);
  });

  it('pins the first column while the rest scrolls', () => {
    assert.match(declarations, /:first-child \{[^}]*position:\s*sticky/);
    assert.match(declarations, /:first-child \{[^}]*inset-inline-start:\s*0/);
  });

  // Live's spacing inside a cell, read on /en-gb/airport-transit: a paragraph 15px below, a list
  // item 8px below, a list 10px above and nothing below. Ours drew 4px, 0 and 0, so the transit
  // rows came out 174 153 153 177 177 against live's 230 205 205 231 231.
  //
  // A cell whose only child is a paragraph is a different case. Live has bare text there and no
  // paragraph at all, so no margin: 16 of the 17 cells on /en-gb/checked-baggage, where our rows
  // read 70 93 93 against live's 66 89 89 on the 4px the global paragraph rule adds.
  it('spaces what is in a cell the way live does', () => {
    const para = /\.table th p,\n\.table td p \{[\s\S]*?\n\}/.exec(declarations);
    assert.ok(para, 'expected a rule for a paragraph in a cell');
    assert.match(para[0], /margin-block-end:\s*15px/);
    const item = /\.table th li,\n\.table td li \{[\s\S]*?\n\}/.exec(declarations);
    assert.ok(item, 'expected a rule for a list item in a cell');
    assert.match(item[0], /margin-block-end:\s*8px/);
    assert.match(declarations, /\.table td (?:ul|ol)[\s\S]*?margin-block:\s*10px 0/);
  });

  it('gives a cell holding one paragraph no margin, because live has no paragraph there', () => {
    assert.match(declarations, /p:only-child[\s\S]*?margin-block-end:\s*0/);
  });

  it('lets a list item in a cell take the cell-s type, as a paragraph does', () => {
    const rule = /\.table (?:th|td) (?:p|li)[^{]*\{[\s\S]*?\n\}/.exec(declarations)[0];
    assert.match(rule, /line-height:\s*inherit/);
    assert.match(rule, /font-weight:\s*inherit/);
    assert.match(declarations, /\.table (?:th|td) li/);
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

// Live's table box is the prose column plus 30px at every width: a Bootstrap `.row` carries
// margin -15px on both sides inside a `.container`, so at 1440 the container is 1240 and the table
// 1270, at 900 it is 783 and 813, at 375 it is 311 and 341. Measured on /en-gb/checked-baggage on
// 2026-08-06 and on the checked-baggage page of four more markets.
//
// The 15px matters because the first cell already carries padding-inline-start: 15px, live's Clay
// rule. With the box flush to the column, as ours was, the first column's text starts 15px inside the
// body text rather than level with it.
describe('the table bleeds past its column the way live does', () => {
  const styles = readFileSync(new URL('../blocks/table/table.css', import.meta.url), 'utf8');
  const rule = /\.table\s*\{[^}]*\}/.exec(styles)[0];

  it('pulls the box out by the 15px the first cell insets', () => {
    assert.match(rule, /margin-inline:\s*-15px/);
  });

  it('takes the width back, or the pull would narrow the table', () => {
    assert.match(rule, /width:\s*calc\(100% \+ 30px\)/);
  });

  // The block scrolls, so a box wider than its wrapper is not clipped and the reading edge holds.
  it('still scrolls, which is what makes the pull safe', () => {
    assert.match(rule, /overflow-x:\s*auto/);
  });
});
