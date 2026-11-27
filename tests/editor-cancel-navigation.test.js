const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// The visible Cancel button and the edge-back gesture share one cancellation path.
assert.match(source, /onclick="cancelEditor\(\)"[^>]*>← Cancelar/);
const cancelStart = source.indexOf('function cancelEditor()');
const cancelEnd = source.indexOf('function insertTag(tag)', cancelStart);
assert.ok(cancelStart >= 0 && cancelEnd > cancelStart, 'cancelEditor must exist');
const cancel = source.slice(cancelStart, cancelEnd);
assert.match(cancel, /editingSongId\s*&&\s*currentSong\s*&&\s*editingSongId\s*===\s*currentSong\.id/);
assert.match(cancel, /song-editor'\)\.style\.display\s*=\s*'none'/);
assert.match(cancel, /if\s*\(wasEditingExistingSong\)[\s\S]*?song-viewer'\)\.style\.display\s*=\s*'block'[\s\S]*?return;[\s\S]*?showList\(\);/);
assert.doesNotMatch(cancel, /saveSong\(|queueFirestoreSync\(/, 'cancelling must never save or sync the draft');

// The same left-edge-to-right swipe used by the song viewer cancels the editor.
const gestureStart = source.indexOf('// --- GESTOS TÁCTILES ---');
const gestureEnd = source.indexOf('// Doble toque en el centro', gestureStart);
assert.ok(gestureStart >= 0 && gestureEnd > gestureStart);
const gestures = source.slice(gestureStart, gestureEnd);
assert.match(gestures, /const isEditorVisible\s*=\s*songEditor\s*&&\s*songEditor\.style\.display\s*===\s*'block'/);
assert.match(gestures, /if\s*\(isEditorVisible\s*&&\s*edgeBackSwipe\)\s*\{\s*cancelEditor\(\);\s*return;/);
assert.ok(gestures.indexOf('if (isEditorVisible && edgeBackSwipe)') < gestures.indexOf("target.closest('button, input, textarea, select, .drag-handle')"), 'editor edge gesture must be handled before form-control filtering');

console.log('Editor cancel/back-gesture regression tests passed.');
