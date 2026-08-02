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
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
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
    row.replaceWith(item);
  });
}
