'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const selector = html.match(/<select id="edit-original-key"[\s\S]*?<\/select>/);
assert.ok(selector, 'Existe el selector de tonalidad original');

const options = [...selector[0].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)];
assert.equal(options.length, 34, 'Se conservan 17 raíces/enarmonías con sus dos modos');

for (let i = 0; i < options.length; i += 2) {
  const [majorValue, majorLabel] = [options[i][1], options[i][2]];
  const [minorValue, minorLabel] = [options[i + 1][1], options[i + 1][2]];
  const root = majorValue.split('|')[0];
  assert.equal(majorValue, root + '|major');
  assert.equal(minorValue, root + '|minor');
  assert.equal(majorLabel, root);
  assert.equal(minorLabel, root + 'm');
}

assert.match(html, /originalMode: selectedOriginalMode/);
assert.match(html, /currentSong\.originalMode === 'minor' \? 'minor' : 'major'/);
assert.match(html, /formatKeyDisplay\(song\.originalKey, song\.originalMode \|\| 'major'\)/);
assert.match(html, /formatKeyDisplay\(baseKey, currentSong\.originalMode \|\| 'major'\)/);
assert.match(html, /selector\.value = suggestion\.tonic \+ '\|' \+ suggestion\.mode/);
assert.match(html, /k !== 'originalMode'/);

console.log('✓ selector, guardado, sugerencia y visualización de tonalidades mayores/menores');
