const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const navigateStart = source.indexOf('function navigateSetlist(direction)');
const navigateEnd = source.indexOf('function openEditor()', navigateStart);
assert.ok(navigateStart >= 0 && navigateEnd > navigateStart);
const navigate = source.slice(navigateStart, navigateEnd);
assert.match(navigate, /buildBlocksHTML\(document\.getElementById\('live-body'\)\);[\s\S]{0,260}liveScreen\.scrollTop\s*=\s*0;/);

const liveStart = source.indexOf('function openLiveView()');
const liveEnd = source.indexOf('function closeLiveView()', liveStart);
assert.ok(liveStart >= 0 && liveEnd > liveStart);
const live = source.slice(liveStart, liveEnd);
assert.match(live, /buildBlocksHTML\(liveBody\);[\s\S]{0,260}liveScreen\.style\.display\s*=\s*'flex';[\s\S]{0,260}liveScreen\.scrollTop\s*=\s*0;/);

console.log('Live song navigation scroll reset regression tests passed.');
