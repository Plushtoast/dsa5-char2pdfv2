import assert from 'assert';
import { ignoreCaptureElement, removeCaptureLeftovers } from '../scripts/htmlsheet/html-to-pdf.js';
import { releaseCanvas } from '../scripts/shared/image.js';

const host = { id: 'dsa5-htmlsheet-host' };

function element(tag, { closestMatch = false, containsHost = false } = {}) {
  return {
    nodeType: 1,
    tagName: tag,
    closest() { return closestMatch ? host : null; },
    ownerDocument: {
      getElementById(id) { return id === 'dsa5-htmlsheet-host' ? host : null; },
    },
    contains(node) { return containsHost && node === host; },
  };
}

assert.strictEqual(ignoreCaptureElement(element('SECTION')), true);
assert.strictEqual(ignoreCaptureElement(element('IFRAME', { closestMatch: true })), true);
assert.strictEqual(ignoreCaptureElement(element('TD', { closestMatch: true })), false);
assert.strictEqual(ignoreCaptureElement(element('DIV', { containsHost: true })), false);
assert.strictEqual(ignoreCaptureElement(element('STYLE')), false);
assert.strictEqual(ignoreCaptureElement(element('LINK')), false);
assert.strictEqual(ignoreCaptureElement(element('BODY')), false);
assert.strictEqual(ignoreCaptureElement(element('HEAD')), false);
assert.strictEqual(ignoreCaptureElement(element('HTML')), false);
assert.strictEqual(ignoreCaptureElement({ nodeType: 3, tagName: 'DIV' }), false);

const canvas = { width: 1588, height: 2246 };
releaseCanvas(canvas);
assert.strictEqual(canvas.width, 0);
assert.strictEqual(canvas.height, 0);
releaseCanvas(null);

const removed = [];
const leftover = { remove() { removed.push(this); } };
removeCaptureLeftovers({
  querySelectorAll() { return [leftover]; },
});
assert.strictEqual(removed.length, 1);

console.log('capture-memory.test.mjs passed');
