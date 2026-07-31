/**
 * Reads the authored grid and says which cells belong in the head and the body.
 *
 * The first row is a header when there is more than one row. 8 of the 186 table
 * blocks in the migrated estate hold a single row, and making that row a header
 * would leave the table with no body. 8 more are ragged, so a row keeps the cells
 * it has rather than being padded to the widest.
 *
 * @param {Element[]} rows the block's row elements, each holding cell elements
 * @returns {{head: Element[], body: Element[][]}} the cell elements themselves
 */
export function buildTable(rows) {
  const filled = [...rows].filter((row) => (row.children || []).length > 0);
  if (filled.length === 0) return { head: [], body: [] };
  const cells = (row) => [...row.children];
  if (filled.length === 1) return { head: [], body: [cells(filled[0])] };
  return { head: cells(filled[0]), body: filled.slice(1).map(cells) };
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const { head, body } = buildTable([...block.children]);
  if (head.length === 0 && body.length === 0) return;

  // The cells move rather than being copied, so a link or a picture keeps the
  // decoration the eager phase already gave it.
  const row = (cells, tag) => {
    const tr = document.createElement('tr');
    cells.forEach((cell) => {
      const target = document.createElement(tag);
      if (tag === 'th') target.setAttribute('scope', 'col');
      target.append(...cell.childNodes);
      tr.append(target);
    });
    return tr;
  };

  const table = document.createElement('table');
  if (head.length) {
    const thead = document.createElement('thead');
    thead.append(row(head, 'th'));
    table.append(thead);
  }
  const tbody = document.createElement('tbody');
  body.forEach((cells) => tbody.append(row(cells, 'td')));
  table.append(tbody);

  block.replaceChildren(table);
}
