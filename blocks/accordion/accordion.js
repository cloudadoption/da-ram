/*
 * Live builds its FAQ from native details and summary: <details class="faq-item">
 * holds a <summary> with the question and a plus icon, and a div with the answer.
 * So this block does the same and needs no script for the collapsing, no state and
 * no keyboard handling.
 *
 * The transform emits two divs per row, the question then the answer, which is why
 * the rows are read positionally rather than by class.
 *
 * Without this block the rows decorated as plain divs and every answer showed:
 * /en-gb/add-extra-luggage displayed 2,452 characters where live displays 1,006.
 *
 * Two families of live page reach this block and they differ on what is open at load.
 * None of the 73 FAQ pages opens a panel. All 10 news pages open their first, which is
 * 688 characters on /en-gb/information/news, so with everything closed the migrated page
 * displayed 182 characters where live displays 1,133. The open-first variant carries that.
 */
export default function decorate(block) {
  const openFirst = block.classList.contains('open-first');
  [...block.children].forEach((row, index) => {
    const [question, answer] = [...row.children];
    if (!question) return;
    const item = document.createElement('details');
    const summary = document.createElement('summary');
    // The question arrives as a div of text. Its children move rather than its
    // markup being copied, so a link inside a question survives.
    while (question.firstChild) summary.append(question.firstChild);
    item.append(summary);
    if (answer) {
      const content = document.createElement('div');
      content.className = 'accordion-answer';
      while (answer.firstChild) content.append(answer.firstChild);
      item.append(content);
    }
    if (openFirst && index === 0) item.open = true;
    row.replaceWith(item);
  });
}
