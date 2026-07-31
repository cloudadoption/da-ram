/*
 * The transform emits a standalone image as its own paragraph. Where live lays
 * several of them out across a row, the migrated page stacked them full width:
 * on en-gb/how-it-works four images rendered 1240x738 each against live's 394px,
 * about 3,000px of the 3,600px by which that page was taller than live's.
 *
 * Roughly 7% of the estate has a run like that, so it is worth decorating rather
 * than re-authoring. A lone image is left alone: that is a picture in its own
 * right, and live renders one at up to 801px.
 */

export const imageRuns = (items, isImageOnly, minimum = 2) => {
  const runs = [];
  let run = [];
  items.forEach((item, index) => {
    if (isImageOnly(item)) {
      run.push(index);
      return;
    }
    if (run.length >= minimum) runs.push(run);
    run = [];
  });
  if (run.length >= minimum) runs.push(run);
  return runs;
};

const holdsOnlyAnImage = (node) => node.tagName === 'P'
  && Boolean(node.querySelector('picture, img'))
  && node.textContent.trim().length === 0;

export const wrapImageRuns = (wrapper, doc, isImageOnly = holdsOnlyAnImage) => {
  const children = [...wrapper.children];
  const runs = imageRuns(children, isImageOnly);
  // Back to front, so wrapping one run does not move the next one's index.
  runs.reverse().forEach((run) => {
    const row = doc.createElement('div');
    row.className = `image-row image-row-${run.length}`;
    wrapper.insertBefore(row, children[run[0]]);
    run.forEach((index) => row.append(children[index]));
  });
  return runs.length;
};

export const decorateImageRows = (main, doc = document) => {
  let rows = 0;
  main.querySelectorAll('.default-content-wrapper').forEach((wrapper) => {
    rows += wrapImageRuns(wrapper, doc);
  });
  return rows;
};
