import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { videoId, embedUrl } from '../scripts/video-embed.js';

// The transform emits an embedded video as a bare link in its own paragraph,
// because the DA canvas cannot carry an iframe. 38 pages across all ten
// languages have one. Rendered as a link it reads as a URL in the copy, so the
// page has to turn it back into a frame.
describe('videoId', () => {
  it('reads the id from an embed url', () => {
    assert.equal(videoId('https://www.youtube.com/embed/_KMGy0hvECQ?controls=0'), '_KMGy0hvECQ');
  });

  it('reads the id from a watch url', () => {
    assert.equal(videoId('https://www.youtube.com/watch?v=_KMGy0hvECQ'), '_KMGy0hvECQ');
  });

  it('reads the id from a short url', () => {
    assert.equal(videoId('https://youtu.be/_KMGy0hvECQ'), '_KMGy0hvECQ');
  });

  it('returns null for anything else', () => {
    assert.equal(videoId('https://www.royalairmaroc.com/en-gb/checked-baggage'), null);
    assert.equal(videoId(''), null);
  });
});

describe('embedUrl', () => {
  it('keeps the parameters live sets, because controls=0 is how live plays it', () => {
    assert.equal(
      embedUrl('https://www.youtube.com/embed/_KMGy0hvECQ?controls=0'),
      'https://www.youtube.com/embed/_KMGy0hvECQ?controls=0',
    );
  });

  it('builds an embed url from a watch url', () => {
    assert.equal(
      embedUrl('https://www.youtube.com/watch?v=_KMGy0hvECQ'),
      'https://www.youtube.com/embed/_KMGy0hvECQ',
    );
  });
});
