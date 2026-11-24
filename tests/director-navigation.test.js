const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const directorFix = fs.readFileSync(path.join(__dirname, '..', 'director-fix.js'), 'utf8');
const index = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// The live Director UI sends the unique sequence instance, not just the
// semantic block id (e.g. "coro-1").
assert.match(
  index,
  /broadcastToMusicians\(\{type:'GO_TO_BLOCK',blockId:block\.id,instanceId:entry\.instanceId\}\)/
);

// The Service Worker hotfix wraps goToRemoteBlock. It must preserve the
// second argument or repeated blocks collapse to the first matching block.
assert.match(
  directorFix,
  /window\.goToRemoteBlock\s*=\s*function\s*\(blockId,\s*instanceId\s*=\s*null\)/
);
assert.match(
  directorFix,
  /originalGoToRemoteBlock\(blockId,\s*instanceId\)/
);

// The incoming Director command must also retain the instance identity.
assert.match(
  index,
  /goToRemoteBlock\(data\.blockId,\s*data\.instanceId\)/
);

console.log('Director repeated-block navigation regression tests passed.');
